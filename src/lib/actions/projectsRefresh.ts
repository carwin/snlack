import { App as Slack, RespondArguments } from '@slack/bolt';
import { readFromDb, dbReadEntry, dbReadNestedEntry, dbWriteEntry, getSnykProjects } from '../utils';
import { SnlackUser, SnykProject } from '../../types';

export const actionRefreshProjects = async (slack: Slack) => {
  slack.action('projects_refresh', async({ ack, payload, body }) => {
    console.enter('Entering actionRefreshProjects()...');
    console.log('payload value', payload);
    console.log('maybe in the body?', body);
    // @ts-ignore
    await ack();

    if (payload.type === 'button') {
      const parsedOrgIdFromValue = payload.value.split('--')[1];

      // This would take too long, really need to re-think storage from the bottom-up.
      // const orgSubEntry = await dbReadNestedEntry({ table: 'users', nestedTable: 'snykOrgs', key: 'id', value: parsedOrgIdFromValue});

      try {
        const dbData = await readFromDb();

        const userEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: body.user.id }) as SnlackUser;

        if (typeof userEntry.snykOrgs === 'undefined') throw `Error reading user's Snyk orgs during project refresh.`;

        // Figure out the requested Org's index within the user entry.
        let entryOrgIndex: number | null = null;
        let entryOrgName: string | null = null;
        userEntry.snykOrgs.map((org, index) => {
          if (org.id === parsedOrgIdFromValue) {
            entryOrgIndex = index;
            entryOrgName = org.name;
          }
        });
        // Throw an error if there's no matching Snyk organization
        // attached to this user.
        if (entryOrgIndex === null || entryOrgName === null) throw `Could not find the requested Org in the list of Orgs this user may access...`;


        // If there are no snykOrgs...
        //   1. How did we get here.
        //   2. We cannot continue without calling Snyk for profile info.
        // if (typeof userEntry.snykOrgs === 'undefined') throw 'There are no Snyk organizations captured for the selected users.';

        // userEntry.snykOrgs.map((org) => {
        //   if (org.id === parsedOrgIdFromValue) orgName = org.name;
        // });

        const remoteProjects = await getSnykProjects(body.user.id, 'bearer', userEntry.snykAccessToken!, parsedOrgIdFromValue);

        remoteProjects.projects.map( project => {
          console.log('remote projects...', project.name);
          project.orgId = parsedOrgIdFromValue;
          project.org = entryOrgName as string;
        });

        if (typeof userEntry.snykProjects !== 'undefined') userEntry.snykOrgs[entryOrgIndex].projects = userEntry.snykOrgs[entryOrgIndex].projects.concat(remoteProjects.projects);
        if (typeof userEntry.snykProjects === 'undefined') userEntry.snykOrgs[entryOrgIndex].projects = remoteProjects.projects;


        await dbWriteEntry({ table: 'users', data: userEntry });

      }
      catch (error) {
        throw 'Error refreshing after button click';
        // throw error;
      }
      finally {
        console.enter('Returning from actionRefreshProjects()...');
      }


    }
    // console.log(orgId);

  });
}
