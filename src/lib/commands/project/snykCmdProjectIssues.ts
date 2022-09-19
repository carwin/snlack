import { RespondArguments, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { SnlackUser, SnykIssue } from '../../../types';
import { projectIssuesListMsg } from '../../messages/cmds/project/projectIssuesListMsg';
import { dbReadEntry, getProjectIndexForEntry, getProjectParentOrgIndexForEntry } from '../../utils';

/**
 * Command handler for the `/snyk project issues` set of commands.
 *
 * @remarks
 * @NOTE - It occurs to me that the utility of this set of commands is likely
 * pretty limited. Its hard to imagine users having their project IDs handy or
 * even taking the time to type out their entire project's name in some cases. I
 * think this project should have this functionality for completeness, but I'm
 * going to prioritize retrieving a project's issues from Slack UI element
 * interactions first.
 */
export const snykCmdProjectListIssues = async (args: SlackCommandMiddlewareArgs) => {
  const rawCommandParts = args.command.text.split(' ');
  const [cmd, subcmd, ...params] = rawCommandParts;

  // @NOTE - `params[0]` should be a project name or UUID. `params[1]` should be an
  // optional Org specifier in case the same project is tracked in multiple Orgs
  // to which the user has access.

  if (subcmd === 'issues' && typeof params[0] === 'undefined') {
    await args.respond(`To retrieve a project's issues, you'll need to pass the project ID as an extra argument to this command.`);
  }

  if (subcmd === 'issues' && typeof params[0] !== 'undefined') {

    const existingEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: args.command.user_id }) as SnlackUser;
      if (typeof existingEntry === 'undefined') console.log('This user might not exist in the db');
      if (typeof existingEntry !== 'undefined') {

        const projectIndex = await getProjectIndexForEntry(params[0]);
        const projectParentOrgIndex = await getProjectParentOrgIndexForEntry(params[0]);

        // @ts-ignore
        const parentOrgId = projectParentOrgIndex && existingEntry.snykOrgs[projectParentOrgIndex].id;
        // @ts-ignore
        const projectId = projectParentOrgIndex && existingEntry.snykOrgs[projectParentOrgIndex].projects[projectIndex].id;
        // @ts-ignore
        const projectName = projectParentOrgIndex && existingEntry.snykOrgs[projectParentOrgIndex].projects[projectIndex].name;
        // ------------------
        // @ts-ignore
        const projectIssues: SnykIssue[] = projectParentOrgIndex && existingEntry.snykOrgs[projectParentOrgIndex].projects[projectIndex].issues as SnykIssue[];


        // If there's no orgId, log a note to the console and respond to the user.
        if (!projectIndex) {
          const projNotFoundMsg = `A Snyk project matching *${params[0]}* could not be found. Are you certain it exists and that you have access to it?`;
          await args.respond(projNotFoundMsg)
            .catch(error => console.log('Error responding to the user about non-existence of requested Project.', error));
        }

        // If we do have an projectId, things can continue.
        else {
          // @ts-ignore
          if (typeof existingEntry.snykOrgs[projectParentOrgIndex].projects === 'undefined') {
            const noProjOnUserMsg = `There was an error retrieving issues for the ${params[0]} project. There seem to be no Snyk projects at all...`;
            await args.respond(noProjOnUserMsg)
              .catch(error => console.log('Error responding to the user about lack of Snyk orgs.', error));
          }
          else {
            const msgArgs = {
              // @ts-ignore
              issues: projectIssues ?? [],
              project: projectName as string,
              projectId: projectId as string,
              projectEntryIndex: projectIndex
            }
            const msg = projectIssuesListMsg(msgArgs) as RespondArguments;
            await args.respond(msg);


          }

        }

      }
  }
}
