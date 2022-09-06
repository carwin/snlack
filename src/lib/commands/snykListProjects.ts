import { RespondArguments, RespondFn, SlashCommand } from "@slack/bolt";
import { projectListMsg, projectListAllMsg } from '../messages';
import { dbReadEntry, dbWriteEntry, EncryptDecrypt, getDbEntryIndex, getSnykOrgIdByName, getSnykProjects, readFromDb } from '../utils';
import { SnlackUser, SnykProject, SnykOrg } from '../../types';

// @TODO: Move to types.
type SnykCommandParts = {
  subcmd?: string | undefined,
  param?: string | undefined,
  param2?: string | undefined,
  param3?: string | undefined
}

/**
 * snykListCommandHandler()
 */
export const snykListCommandHandler = async(rawCommand: SlashCommand, respond: RespondFn, { subcmd, param, param2, param3 }: SnykCommandParts) => {

  // New instance of EncryptDecrypt.
  const eD = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET);

  // ---------------------------------------------------------------------------
  // `/snyk project` command entrypoint.
  // ---------------------------------------------------------------------------
  if (typeof subcmd === 'undefined') {
    await respond('You probably meant to pass a parameter like `list`. Try this:\n \`\`\`/snyk project list\`\`\`\nor\n\`\`\`/snyk project list \'My Org Name\'\`\`\`');
  }


  // ---------------------------------------------------------------------------
  // List all projects, regardless of Org.
  // ---------------------------------------------------------------------------
  else if (subcmd === 'list' && typeof param === 'undefined') {
    let projectCollection: SnykProject[] = [];
    const existingUserEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: rawCommand.user_id }) as SnlackUser;

    if (typeof existingUserEntry === 'undefined' || typeof existingUserEntry.snykOrgs === 'undefined') throw 'No entry for calling user, try authenticating with Snyk from the App config.';

    existingUserEntry.snykOrgs.map((org) => {
      projectCollection = projectCollection.concat(org.projects);
    });

    const msg = await projectListAllMsg(projectCollection, rawCommand.user_id);

    await respond(msg as RespondArguments);
  }


  // ---------------------------------------------------------------------------
  // List all the projects within Org (param).
  // ---------------------------------------------------------------------------
  // @TODO - No need to do the readFromDb() stuff. Just go grab the one we're interested in using dbReadEntry().
  // @TODO - Type gates are too strong in places. Users should still get a response when they pass an Org name that doesn't exist.
  else if (subcmd === 'list' && typeof param !== 'undefined') {
    // Everything within this scope relies, more or less, on having a Snyk
    // organization ID, which we'll retrieve by parsing the name value (given to
    // the function via the `param` argument).
    const orgId: string = await getSnykOrgIdByName(rawCommand.user_id, param) as string;

    // If there's no orgId, log a note to the console and respond to the user.
    if (!orgId) {
      const orgNotFoundMsg = `A Snyk organization matching *${param}* could not be found. Are you certain it exists and that you have access to it?`;
      await respond(orgNotFoundMsg)
        .catch(error => console.log('Error responding to the user about non-existence of requested Org.', error));
    }

    // If we do have an orgId, things can continue.
    else {

      // See if there's an entry in the current lowdb file for a user that
      // matches the user calling the command.
      const existingEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: rawCommand.user_id }) as SnlackUser;
      if (typeof existingEntry === 'undefined') console.log('This user might not exist in the db');

      if (typeof existingEntry !== 'undefined') {

        // If there's no snykOrgs key on the existing entry, we should let the
        // user know there's a problem.  We could throw an error too, but we
        // don't need to have the whole app bail.
        if (typeof existingEntry.snykOrgs === 'undefined') {
          const noOrgsOnUserMsg = `There was an error retrieving projects for ${param}. There seem to be no Snyk organizations at all...`;
          await respond(noOrgsOnUserMsg)
            .catch(error => console.log('Error responding to the user about lack of Snyk orgs.', error));
        }
        else {

          // Define a matching function to use for finding the user's desired
          // SnykOrg object
          const orgNameMatch = (org: SnykOrg) => org.name === param;
          let desiredOrgIndex: undefined | number;

          // Look for the SnykOrgs array index that matches the org the user has
          // requested via `param`.
          desiredOrgIndex = existingEntry.snykOrgs.findIndex(orgNameMatch) || undefined;

          // Write it to the "db" file.
          await dbWriteEntry({ table: 'users', data: existingEntry });

          // Only continue if the desiredOrgIndex has been found.
          if (typeof desiredOrgIndex === 'number') {
            // Send the message to the user.  The message should contain
            // the list of projects in the given Snyk org or a statement
            // letting them know that there were no projects in the given
            // organization (provided by `param`).
            const msg = projectListMsg(existingEntry.snykOrgs[desiredOrgIndex].projects, param, orgId, desiredOrgIndex) as RespondArguments;
            await respond(msg);
          }
          else {
            // @TODO - I don't think this will ever fire because earlier conditions will `throw` or otherwise end things early, sometimes crashing the program.
            await respond(`Couldn't find any projects within ${param}. Are you sure this Snyk organization exists and that you have access to it?`);
          }



        }

      }

    }

  }
}


