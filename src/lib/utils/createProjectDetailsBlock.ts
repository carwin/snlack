import { SnykProject, DbTableEntry, SnlackUser } from '../../types';
import { projectInfoMsg } from '../messages';
import { createProjObj } from './createProjObj';
import { dbReadEntry } from './db';

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
