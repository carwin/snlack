import { App as Slack } from '@slack/bolt';
import { SnlackUser, SnykProject } from '../../types';
import { projectDepsMsg } from '../messages';
import { dbReadEntry, getProjectIndexForEntry, getProjectParentOrgIndexForEntry, getSnykProjectDeps } from '../utils';

/** Action handler for returning a Project's dependencies as a message. */
export const actionGetProjectDependencies = (slack: Slack) => {
  slack.action('get-project-deps', async(args) => {
    const {ack, payload, body, respond} = args;
    ack();
    if (payload.type === 'button') {

      try {
        const value = payload.value.split('--')[1];
        const projectIndex = await getProjectIndexForEntry(value, body.user.id);
        const orgIndex = await getProjectParentOrgIndexForEntry(value, body.user.id);
        const entry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: body.user.id }) as SnlackUser;

        const orgId = entry.snykOrgs?.[orgIndex].id;
        const projId = entry.snykOrgs?.[orgIndex].projects[projectIndex].id;

        const rawDeps = await getSnykProjectDeps(body.user.id, orgId as string, projId as string);

        const msg = await projectDepsMsg(entry.snykOrgs?.[orgIndex].projects?.[projectIndex] as SnykProject, rawDeps);

        await respond(msg);
      } catch (error) {
        await respond('There was a problem fetching dependencies for that organization.');
        console.log(`Error in actionGetProjectDependencies()...\n${error}`);
      }

    }
  })
}
