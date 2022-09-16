import { RespondArguments, RespondFn, SlashCommand } from '@slack/bolt';
import { SnykCommandParts } from '../../../types';

// @NOTE - It occurs to me that the utility of this set of commands is likely
// pretty limited. Its hard to imagine users having their project IDs handy or
// even taking the time to type out their entire project's name in some cases. I
// think this project should have this functionality for completeness, but I'm
// going to prioritize retrieving a project's issues from Slack UI element
// interactions first.

// export const snykProjectIssuesCommandHandler = async(rawCommand: SlashCommand, respond: RespondFn, {subcmd, param, param2, param3}: SnykCommandParts) => {
export const snykCmdProjectIssues = async(rawCommand: SlashCommand, respond: RespondFn, {subcmd, param, param2, param3}: SnykCommandParts) => {

  if (subcmd === 'issues' && typeof param === 'undefined') {
    await respond(`To retrieve a project's issues, you'll need to pass the project ID as an extra argument to this command.`);
  }

  if (subcmd === 'issues' && typeof param !== 'undefined') {
    // @TODO - This is where we'll handle looking up the project and pulling its issues from the Snyk API.
    await respond(`Coming soon...`);
  }

}
