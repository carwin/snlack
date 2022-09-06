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

    if (!orgId) {
      const orgNotFoundMsg = `A Snyk organization matching *${param}* could not be found. Are you certain it exists and that you have access to it?`;
      await respond(orgNotFoundMsg)
        .catch(error => console.log('Error responding to the user about non-existence of requested Org.', error));
    }

    else {

      try {
        // See if there's an entry in the current lowdb file for a user that
        // matches the user calling the command.
        const existingEntryIndex: any = await getDbEntryIndex({ table: 'users', key: 'slackUid', value: rawCommand.user_id }) as number;
        console.problem(`The existing entry index we tried to get is: ${existingEntryIndex}`);

        // If such an entry exists...
        if (typeof existingEntryIndex !== 'undefined' && typeof existingEntryIndex !== 'boolean') {

          // Yoink the current db contents to peruse for projects.
          const dbContent = await readFromDb();

          // Since we know there's an existing entry, use its index in the
          // users table. This could probably be more elegant, but we're
          // just hacking for now.
          const existingEntry: SnlackUser = dbContent.users[existingEntryIndex];

          if (typeof existingEntry.snykOrgs === 'undefined') throw new Error(`There was an error retrieving projects for ${param}. There seem to be no Orgs at all...`);

          // Create a working array, primarily to make TypeScript shut up about
          // potentially undefined keys on existingEntry.
          const localSnykOrgs: SnykOrg[] = existingEntry.snykOrgs;

          // Query the Snyk API for Projects and Orgs.
          const newRemoteData = await getSnykProjects(rawCommand.user_id) as unknown[] as SnykOrg[];

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
      } catch (error) {
        console.error('Got an error handling Slack command: `/snyk project list <snyk org>`.');
        // @ts-ignore
        // console.error(error);
        throw error.data;
      }
    }

  }
}
