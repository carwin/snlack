import { RespondArguments, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { validate as uuidValidate } from 'uuid';
import { SnlackUser, SnykOrg, SnykProject } from '../../../types';
import { projectListAllMsg, projectListMsg } from '../../messages';
import { dbReadEntry, getSnykOrgIdByName, getSnykOrgNameById } from '../../utils';

/**
 * Command handler for `/snyk project list <etc...>`
 *
 * @group Commands
 */
// export const snykCmdProjectList: CmdHandlerFn = async(rawCommand, respond, { subcmd, ...params}: SnykCommandParts): Promise<void> => {
export const snykCmdProjectList = async(args: SlackCommandMiddlewareArgs): Promise<void> => {
  const rawCommandParts = args.command.text.split(' ');
  const [cmd, subcmd, ...params] = rawCommandParts;

  // ---------------------------------------------------------------------------
  // List all projects, regardless of Org.
  // ---------------------------------------------------------------------------
  if (typeof params[0] === 'undefined' || params[0] === 'All') {
    let projectCollection: SnykProject[] = [];
    const existingUserEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: args.command.user_id }) as SnlackUser;

    // @TODO - Give the user an indication something went awry.
    if (typeof existingUserEntry === 'undefined') {
      console.log('No entry for calling user, try authenticating with Snyk from the App config.');
      await args.respond ({
        replace_original: false,
        delete_original: false,
        response_type: 'ephemeral',
        text: `It looks like there isn't any data for you. Try authenticating with Snyk from the App's configuration page and trying again.`
      });
    }

    if (typeof existingUserEntry !== 'undefined') {
      existingUserEntry.snykOrgs?.map((org) => {
        projectCollection = projectCollection.concat(org.projects);
      });
    }

    const msg = await projectListAllMsg(projectCollection, args.command.user_id);

    await args.respond(msg as RespondArguments);
  }

  // ---------------------------------------------------------------------------
  // List all the projects within Org (param).
  // ---------------------------------------------------------------------------
  // @TODO - No need to do the readFromDb() stuff. Just go grab the one we're interested in using dbReadEntry().
  // @TODO - Type gates are too strong in places. Users should still get a response when they pass an Org name that doesn't exist.
  else if (typeof params[0] !== 'undefined') {

    // Use uuid validation to determine whether or not the user passed an Org ID
    // as the parameter, or an Org name string.
    const isUUID = uuidValidate(params[0]);

    // Everything within this scope relies, more or less, on having a Snyk
    // organization ID, which we'll retrieve by parsing the name value (given to
    // the function via the `params[0]` argument).
    // const orgId: string = await getSnykOrgIdByName(rawCommand.user_id, params[0]) as string;
    const orgId = isUUID ? params[0] : await getSnykOrgIdByName(args.command.user_id, params[0]) as string;

    // If there's no orgId, log a note to the console and respond to the user.
    if (!orgId) {
      const orgNotFoundMsg = `A Snyk organization matching *${params[0]}* could not be found. Are you certain it exists and that you have access to it?`;
      await args.respond(orgNotFoundMsg)
        .catch(error => console.log('Error responding to the user about non-existence of requested Org.', error));
    }

    // If we do have an orgId, things can continue.
    else {

      // See if there's an entry in the current lowdb file for a user that
      // matches the user calling the command.
      const existingEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: args.command.user_id }) as SnlackUser;
      if (typeof existingEntry === 'undefined') console.log('This user might not exist in the db');

      if (typeof existingEntry !== 'undefined') {

        // If there's no snykOrgs key on the existing entry, we should let the
        // user know there's a problem.  We could throw an error too, but we
        // don't need to have the whole app bail.
        if (typeof existingEntry.snykOrgs === 'undefined') {
          const noOrgsOnUserMsg = `There was an error retrieving projects for ${params[0]}. There seem to be no Snyk organizations at all...`;
          await args.respond(noOrgsOnUserMsg)
            .catch(error => console.log('Error responding to the user about lack of Snyk orgs.', error));
        }
        else {

          // Define a matching function to use for finding the user's desired
          // SnykOrg object
          const orgNameMatch = (org: SnykOrg) => org.name === params[0].toString();
          const orgIdMatch = (org: SnykOrg) => {
            return org.id === params[0].toString();
          }
          let desiredOrgIndex: undefined | number;

          // Look for the SnykOrgs array index that matches the org the user has
          // requested via `param`.
          if (isUUID) {
            desiredOrgIndex = existingEntry.snykOrgs.findIndex(orgIdMatch) as number ?? undefined;
          } else {
            desiredOrgIndex = existingEntry.snykOrgs.findIndex(orgNameMatch) as number ?? undefined;
          }

          // @TODO - No need to write if we're only calling the API during user action.
          // Write it to the "db" file.
          // await dbWriteEntry({ table: 'users', data: existingEntry });

          // Only continue if the desiredOrgIndex has been found.
          if (typeof desiredOrgIndex === 'number') {
            // Send the message to the user.  The message should contain
            // the list of projects in the given Snyk org or a statement
            // letting them know that there were no projects in the given
            // organization (provided by `params[0]`).

            const msgArgs = {
              projects: existingEntry.snykOrgs[desiredOrgIndex].projects as SnykProject[],
              org: isUUID ? await getSnykOrgNameById(args.command.user_id, params[0]): params[0],
              orgId,
              orgEntryIndex: desiredOrgIndex
            }

            // const msg = projectListMsg(existingEntry.snykOrgs[desiredOrgIndex].projects, param, orgId, desiredOrgIndex) as RespondArguments;
            // @ts-ignore
            const msg = projectListMsg(msgArgs) as RespondArguments;
            await args.respond(msg);
          }
          else {
            // @TODO - I don't think this will ever fire because earlier conditions will `throw` or otherwise end things early, sometimes crashing the program.
            await args.respond(`Couldn't find any projects within ${params[0]}. Are you sure this Snyk organization exists and that you have access to it?`);
          }

        }

      }

    }

  }

}
