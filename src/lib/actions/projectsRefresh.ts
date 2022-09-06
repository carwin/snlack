import { App as Slack, RespondArguments } from '@slack/bolt';
import { readFromDb, dbReadEntry, dbReadNestedEntry, dbWriteEntry, getSnykProjects } from '../utils';
import { SnlackUser, SnykProject, SnykOrg } from '../../types';
import { state } from '../../App';



export const actionRefreshProjects = async (slack: Slack) => {
  slack.action('projects_refresh', async({ ack, payload, body, respond }) => {
    console.enter('Entering actionRefreshProjects()...');
    await ack();
    state.changeUser(body.user.id);

    if (payload.type === 'button') {
      const parsedOrgIdFromValue = payload.value.split('--')[1];

        // const dbData = await readFromDb();

        const userEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: body.user.id }) as SnlackUser;

        const newData = await actionRefreshAllProjects(userEntry, body.user.id);

        if (!newData) {
          await respond('There was a problem refreshing project data from Snyk');
        }
        else {

          userEntry.snykOrgs = newData;

          // Write it to the "db" file.
          await dbWriteEntry({ table: 'users', data: userEntry });

          await respond({
            delete_original: false,
            replace_original: false,
            response_type: 'ephemeral',
            text: 'Data successfully refreshed, try sending your command again.'
          });
        }

      }

    }

  );

}


export const actionRefreshAllProjects = async(existingEntry: SnlackUser, slackUid: string) => {
  // This should only happen when:
  // -----------------------------
  // 1. There are no projects in a SnykOrg.
  // 2. When a user initiates a pull / refresh.
  if (typeof existingEntry.snykOrgs !== 'undefined') {
    // Create a working array, primarily to make TypeScript shut up about
    // potentially undefined keys on existingEntry.
    const localSnykOrgs: SnykOrg[] = existingEntry.snykOrgs;

    // Query the Snyk API for Projects and Orgs.
    // const newRemoteData = await getSnykProjects(rawCommand.user_id)
    const newRemoteData = await getSnykProjects(slackUid)
      .catch(error => {
        console.log('Catching the error after the getSnykProjects promise.', error);
      }) as unknown[] as SnykOrg[];

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Pseudo-code / thought-process / etc:
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // - query Snyk for new projects
    // - the returned data gets structured as a drop-in replacement for
    //   `users[X].snykOrgs`
    // - We could totally drop the existing snykOrgs array's contents, but
    //   we might end up with some kind of local modifications.  Probably
    //   safer to just merge.
    // - If we're merging we need to to ensure we overwrite existing keys
    // - There may be new orgs in our remote data, ensure we append those.
    newRemoteData.map((newOrg: SnykOrg) => {
      // We'll use these two loop-level constants to figure out which local Org objects
      // to override with remote data.
      const orgIdMatch = (org: SnykOrg) => org.id === newOrg.id;
      const orgToReplace = localSnykOrgs.findIndex(orgIdMatch) as number;

      // For each project we're getting from the remote data, let's append
      // org and org ID keys to make later lookups easier.
      newOrg.projects.map((newProj: SnykProject) => {
        newProj.org = newOrg.name;
        newProj.orgId = newOrg.id;
      })
      // If `orgToReplace` came back with an index for us, replace the local
      // copy of this `SnykOrg` with the remote copy.
      if (typeof orgToReplace !== 'undefined') {
        try {
          // existingEntry.snykOrgs[orgToReplace] = newOrg;
          localSnykOrgs[orgToReplace] = newOrg;
        }
        catch (error) {
          console.error(`Could not map matching remote orgs/projects to local orgs/projects.\n${error}`);
          throw error;
        }
      }
      // If orgToReplace didn't give an index, this seems like a new
      // `SnykOrg` object. Append it.
      else {
        localSnykOrgs.push(newOrg);
      }
      // Assign the working array back to the existingEntry.
      existingEntry.snykOrgs = localSnykOrgs;
    });

    return localSnykOrgs;

  }

  return false;
}
