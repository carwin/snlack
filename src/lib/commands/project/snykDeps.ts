import { RespondArguments, RespondFn, SlashCommand } from '@slack/bolt';
import slugify from 'slugify';
import { validate as validateUUID } from 'uuid';
import { SnlackUser, SnykCommandParts, SnykOrg, SnykProject } from '../../../types';
import { SnykDependency } from '../../../types/snykDependency';
import { projectDepsMsg, projectDependencyMissingArgMsg } from '../../messages';
import { dbReadEntry, getProjectIndexForEntry, getProjectParentOrgIndexForEntry, readFromDb } from '../../utils';
import { getSnykProjectDeps } from '../../utils/getSnykProjectDeps';

export const snykDependencyListCommandHandler = async(rawCommand: SlashCommand, respond: RespondFn, {subcmd, ...params}: SnykCommandParts) => {
  const existingUserEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: rawCommand.user_id }) as SnlackUser;
  let projectArgType: 'id' | 'name';

  // List a project's dependencies
  if (subcmd === 'list') {

    // If the parameter is undefined, tell the user they have to pass a project for it to work.
    if (typeof params[0] === 'undefined') await respond(projectDependencyMissingArgMsg());

    // If param is defined:
    if (typeof params[0] !== 'undefined') {
      // Start by figuring out the projectId,
      let projectId: string;

      // If the param value is indeed a UUID, we know we were correct above.
      projectArgType = validateUUID(params[0]) ? 'id' : 'name';

      // If the project argument type is 'name' / not a UUID, then we need to
      // look up the project's ID for the API call.
      if (projectArgType === 'name') {
        projectId = await getProjectIdByName(rawCommand.user_id, params[0]) as string;
      }
      else {
        projectId = params[0];
      }

      // Now we need an organization ID to complete the API call to the
      // dependencies endpoint at Snyk. We'll have to do some looking up again,
      // unless the user was kind enough to provide params[1], which is optional.
      const orgIndex = await getProjectParentOrgIndexForEntry(projectId, rawCommand.user_id);
      const projIndex = await getProjectIndexForEntry(projectId, rawCommand.user_id);

      const orgId = existingUserEntry?.snykOrgs?.[orgIndex].id;

      const rawDeps = await getSnykProjectDeps(rawCommand.user_id, orgId!, projectId);

      const msg = projectDepsMsg(existingUserEntry.snykOrgs?.[orgIndex]?.projects?.[projIndex] as SnykProject, rawDeps);

      await respond(msg);
    }


  }

}


// @todo move to msgs

const getProjectIdByName = async (slackUid: string, projName: string, orgId?: string) => {
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


// This is the best function name to date.
const getOrgProjIndexFromNameWhenOrgUnknown = (orgs: SnykOrg[], projectName: string): {proj: number, org: number} => {

  // db.users[userIndex].snykOrgs?.map( (org, index) => {
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


const generateDepDetailBlock = (dep: SnykDependency) => {

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: dep.name
      }
    },
    {
      context: {
        elements: [
          {
            type: 'mrkdwn',
            text: `${dep.id}`
          }
        ]
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Type*: ${dep.type}`,
        }
      ]
    }
  ]

}


const generateDepListItemBlock = (dep: SnykDependency) => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Name*: \`${dep.name}\` ⸱ *Type*: ${dep.type} ⸱ *Version*: ${dep.version}`
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_critical: ${dep.issuesCritical}  high: ${dep.issuesHigh}  medium: ${dep.issuesMedium} low: ${dep.issuesLow}_`
        }
      ]
    },
    {
      type: 'divider'
    },
  ]
}
