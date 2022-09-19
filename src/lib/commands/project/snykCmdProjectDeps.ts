import { SlackCommandMiddlewareArgs } from '@slack/bolt';
import { validate as validateUUID } from 'uuid';
import { SnlackUser, SnykProject } from '../../../types';
import { SnykDependency } from '../../../types/snykDependency';
import { projectDependencyMissingArgMsg, projectDepsMsg } from '../../messages';
import { dbReadEntry, getProjectIdByName, getProjectIndexForEntry, getProjectParentOrgIndexForEntry, getSnykProjectDeps } from '../../utils';

/** Slack command handler for project dependency commands. */
export const snykCmdProjectDeps = async (args: SlackCommandMiddlewareArgs): Promise<void> => {
  const rawCommandParts = args.command.text.split(' ');
  const [cmd, subcmd, ...params] = rawCommandParts;
  const existingUserEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: args.command.user_id }) as SnlackUser;
  let projectArgType: 'id' | 'name';

  // List a project's dependencies
  if (subcmd === 'deps' || 'dependencies') {

    // If the parameter is undefined, tell the user they have to pass a project for it to work.
    if (typeof params[0] === 'undefined') await args.respond(projectDependencyMissingArgMsg());

    // If param is defined:
    if (typeof params[0] !== 'undefined') {
      // Start by figuring out the projectId,
      let projectId: string;

      // If the param value is indeed a UUID, we know we were correct above.
      projectArgType = validateUUID(params[0]) ? 'id' : 'name';

      // If the project argument type is 'name' / not a UUID, then we need to
      // look up the project's ID for the API call.
      if (projectArgType === 'name') {
        projectId = await getProjectIdByName(args.command.user_id, params[0]) as string;
      }
      else {
        projectId = params[0];
      }

      // Now we need an organization ID to complete the API call to the
      // dependencies endpoint at Snyk. We'll have to do some looking up again,
      // unless the user was kind enough to provide params[1], which is optional.
      const orgIndex = await getProjectParentOrgIndexForEntry(projectId, args.command.user_id);
      const projIndex = await getProjectIndexForEntry(projectId, args.command.user_id);

      const orgId = existingUserEntry?.snykOrgs?.[orgIndex].id;

      const rawDeps = await getSnykProjectDeps(args.command.user_id, orgId!, projectId);

      const msg = projectDepsMsg(existingUserEntry.snykOrgs?.[orgIndex]?.projects?.[projIndex] as SnykProject, rawDeps);

      await args.respond(msg);
    }

  }

}


// @todo move to msgs
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
