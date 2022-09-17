import { App as Slack } from '@slack/bolt';
import { SnlackUser, SnykDependency } from '../../types';
import { dbReadEntry, getProjectParentOrgIndexForEntry, getSnykProjectDeps } from '../utils';

export const actionGetProjDepSnippet = async(slack: Slack) => {
  slack.action('get-proj-dep-snippet', async({ ack, client, payload, body }) => {
    await ack();
    const channelId = body?.channel?.id;
    console.log('CHANNEL ID', channelId);
    let projectId = payload.type === 'button' ? payload.value : null;
    console.log('PROJECT ID', projectId);

    if (projectId !== null) {

      projectId = projectId.split('--')[1]; // the value off the payload will be `project--<project id>`.
      console.log('PROJECT ID', projectId);
      const userEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: body.user.id }) as SnlackUser;
      const parentOrgIndex = await getProjectParentOrgIndexForEntry(projectId, body.user.id);
      const orgId = userEntry.snykOrgs?.[parentOrgIndex].id;

      if (typeof orgId !== 'undefined') {
        const rawDeps = await getSnykProjectDeps(body.user.id, orgId, projectId, 1000);

        let depString: string = '';

        rawDeps.map( (dep: SnykDependency) => {
          depString += `- ${dep.id}\n`
        });


        try {
          const result = await client.files.upload({
            title: `Project Dependencies: ${projectId}`,
            filename: `project_dependencies--${projectId}`,
            filetype: `auto`,
            channels: channelId,
            initial_comment: "This snippet contains the current dependency list in a plaintext format.",
            content: depString

          });

          console.log('result: ', result);

        } catch (error) {
          console.log('Oopsie Daisies sold here.', error);
        }

      }

    }

  });
}
