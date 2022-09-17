import { SnlackUser, SnykAPIVersion, SnykOrg, SnykProject, SnykProjectMsgParts } from '../../types';
import { projectInfoMsg } from '../messages';
import { callSnykApi, callSnykApi2, dbReadEntry, EncryptDecrypt, readFromDb } from './';

/**
 * Return the RespondArguments for a project details msg.
 *
 * @remarks
 * This abstraction exists because there are a handful of processes that return
 * this same message. Most notably, the dropdown menu on a `/snyk org info` response
 * and the 'More Details' link in the overflow of a `/snyk project list` response.
 *
 * @example
 * ```
 * const msg = await createProjectDetailsBlock(userUid, orgIndex, projIndex);
 * await respond(msg);
 * ```
 *
 * @param userUid the user calling the command. This is the user whose entry
 *                will be looked up in the database to find the appropriate Snyk Org and
 *                Project.
 * @param orgIndex the index of the desired Org within the user entry's `snykOrgs` array.
 * @param projIndex the index of the desired Project within the user entry's org entry's `projects` array.
 */
export const createProjectDetailsBlock = async(userUid: string, orgIndex: number, projIndex: number) => {
  try {
    const userEntry = await dbReadEntry({ table: 'users', key: 'slackUid', value: userUid }) as SnlackUser;
    console.log('getting a user entry now...', typeof userEntry);

    if (typeof userEntry !== 'undefined') {
      const projectFocus = userEntry.snykOrgs![orgIndex].projects[projIndex] as SnykProject;
      const projObj = createProjObj(projectFocus);
      return projectInfoMsg(projObj);
    } else {
      return('Sorry, there was an error fetching that project\'s details');
    }

  }
  catch (error) {
    console.log(`Error trying to return a project's details: \n${error}`);
    return('Sorry, there was an error fetching that project\'s details');
  }
}

/**
 * Retrieve a user's Snyk projects from Snyk.
 */
export const getSnykProjects = async(slackCallerUid: string): Promise<unknown[]> => {
  const data = await dbReadEntry({table: 'users', key: 'slackUid', value: slackCallerUid }) as SnlackUser;

  if (typeof data === 'undefined' || !data) return [];

  const eD = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);
  const access_token = eD.decryptString(data.snykAccessToken as string);
  const token_type = data.snykTokenType;

  // Call the axios instance configured for Snyk API v1.
  const requests = (data.snykOrgs ?? []).map((org) =>
    callSnykApi(token_type as string, access_token, SnykAPIVersion.V1)
      .post(`/org/${org.id}/projects`)
      .then((project): SnykOrg => ({
        name: org.name,
        id: org.id,
        projects: project.data.projects || [],
      }))
      .catch((error) => {
        console.log('callSnykApi from getSnykProjects() Promise has been rejected.');
        console.log('Maybe there was an error?', error);
      }));

  return Promise.all(requests);
}

/**
 * Turn a `SnykProject` into a `projObj`.
 *
 * @remarks
 * Honestly, I can't even remember what this was for or why I did it. This, and
 * whatever is using it probably Needs a refactor.
 *
 */
export const createProjObj = (project: SnykProject) => {

  const projObj: SnykProjectMsgParts = {
    id: project.id,
    name: project.name,
    origin: project.origin,
    isMonitored: project.isMonitored.toString(),
    org: project.org,
    browseUrl: project.browseUrl,
    projType: project.type,
    readOnly: project.readOnly.toString(),
    issuesCount: project.issueCountsBySeverity,
    importingUser: project.importingUser?.name || null,
    testFrequency: project.testFrequency,
    lastTestDate: project.lastTestedDate.toString(),
    depCount: project.totalDependencies,
    tags: typeof project.tags !== 'undefined' && Array.isArray(project.tags) ? project.tags : undefined,
    imagePlatform: typeof project.imagePlatform !== 'undefined' ? project.imagePlatform : undefined,
    imageTag: typeof project.imagePlatform !== 'undefined' ? project.imageTag : undefined,
    imageId: typeof project.imageId !== 'undefined' ? project.imageId : undefined,
    criticality: typeof project.attributes.criticality !== 'undefined' && Array.isArray(project.attributes.criticality) ? project.attributes.criticality : undefined,
    lifecycle: typeof project.attributes.lifecycle !== 'undefined' && Array.isArray(project.attributes.lifecycle) ? project.attributes.lifecycle : undefined,
    environment: typeof project.attributes.environment !== 'undefined' && Array.isArray(project.attributes.environment) ? project.attributes.environment : undefined,
  }

  return projObj;

}

export const getProjectIdByName = async (slackUid: string, projName: string, orgId?: string) => {
  const db = await readFromDb();
  let orgIndex: number = -1;
  let projIndex: number = -1;
  let userIndex: number = -1;

  const userIndexMatch = (user: SnlackUser) => user.slackUid === slackUid;
  const orgIndexMatch = (org: SnykOrg) => org.id === org.id;

  userIndex = db.users.findIndex(userIndexMatch);

  // If the user has no Orgs, fail.
  if (typeof db.users[userIndex].snykOrgs === 'undefined' || db.users[userIndex].snykOrgs?.length === 0) return;

  // If the optional orgId was passed, things get a little easier.
  if (typeof orgId !== 'undefined') {
    console.log('orgId was passed to getprojectidbyname()')
    orgIndex = db.users[userIndex].findIndex(orgIndexMatch);
  }
  // I suppose we'll have to loop through each org's projects looking for the match.
  else {
    const steppedIndexSearch = getOrgProjIndexFromNameWhenOrgUnknown(db.users[userIndex].snykOrgs as SnykOrg[], projName);
    orgIndex = steppedIndexSearch.org;
    projIndex = steppedIndexSearch.proj;
  }


  // At this point we should have all the indices for the bits we want, let's
  // get that ID.
  const projectID = db?.users[userIndex]?.snykOrgs?.[orgIndex]?.projects?.[projIndex]?.id;

  return projectID;
}

/**
 * Return project and org index information when all that is known is the Project name.
 *
 * @remarks
 * This is definitely the best function name to date.
 *
 */
export const getOrgProjIndexFromNameWhenOrgUnknown = (orgs: SnykOrg[], projectName: string): {proj: number, org: number} => {

  let projIndex: number = -1;
  let orgIndex: number = -1;

  orgs.map( (org, index) => {

    // Only perform the following operation if we don't actually have a projIndex value yet.
    if (projIndex === -1 || typeof projIndex === 'undefined') {
      projIndex = org.projects.findIndex( (proj, subindex) => {
        // Exit straightaway if the project name doesn't match
        if (proj.name !== projectName) return false;

        // If we didn't hit that last condition, the parent loop's index
        // should be set to the orgIndex and we'll return true. That tells
        // findIndex that this sub-index is what it should assign to
        // projIndex.
        orgIndex = index;
        return true;
      });

    }

  });

  return { proj: projIndex, org: orgIndex }
}


/**
 * Wrapper around API call to retrieve project dependencies from Snyk.
 *
 * @remarks
 * Some of this seems very convoluted, and it is. It stems from some poor
 * choices made in the early design phase around how to store data locally.  Next
 * time, I should outsource db structure design.
 */
export const getSnykProjectDeps = async(slackCallerUid: string, orgId: string, projectId: string, perPage?: number, pageCur?: number): Promise<any> => {
  const data = await dbReadEntry({table: 'users', key: 'slackUid', value: slackCallerUid }) as SnlackUser;
  if (!data || typeof data === 'undefined') return [];
  const userIndexMatch = (user: SnlackUser) => user.slackUid === slackCallerUid;
  const orgIndexMatch = (org: SnykOrg) => org.id === orgId;
  const projIndexMatch = (proj: SnykProject) => proj.id === projectId;

  // @TODO - Implement pagination connected with Slack UI buttons.
  const fetchPage = (typeof pageCur === undefined) ? 0 : pageCur! + 1;

    const orgIndex = data.snykOrgs?.findIndex(orgIndexMatch);

    if (typeof orgIndex !== 'undefined') {

      const projIndex = data.snykOrgs?.[orgIndex]?.projects.findIndex(projIndexMatch);

      if (typeof projIndex !== 'undefined') {
        const eD = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);
        const access_token = eD.decryptString(data?.snykAccessToken as string);
        const token_type = data.snykTokenType;

        const snykAPIReqArgs = {
          tokenType: token_type as string,
          token: access_token,
          version: SnykAPIVersion.V1,
          // data: JSON.stringify({
          //   filters: {
          //     projects: [ projectId ]
          //   }
          // })
        }


        console.log('Filtering by projects: ', projectId);

        const postData = JSON.stringify(
          {
            "filters": {
              "projects": [projectId],
              // "severity": [
              //   "high",
              //   "critical",
              //   "medium",
              //   "low"
              // ],
            },
          }
        );
        // const requests = await callSnykApi2(snykAPIReqArgs)
        const depOutput = await callSnykApi2(snykAPIReqArgs)
          .post(`/org/${orgId}/dependencies?sortBy=severity&page=${fetchPage}&perPage=${perPage || 10}`, postData)
          .then((deps) => deps.data.results)
          .catch( (error) => {
            console.log('callSnykApi from getSnykProjects() Promise has been rejected.');
            console.log('Maybe there was an error?', error);
          });

        return depOutput;

      }

      // The proj index was undefined, there's no proj with that ID in our db!
      else {
        console.log('There is no project in that org with that ID on that user in our DB.');
      }

    }
    // The org index was undefined, there's no org with that ID in our db!
    else {
      console.log('There is no org with that ID on that user in our DB.');
    }
}
