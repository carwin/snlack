import { App as Slack, AllMiddlewareArgs, SlackCommandMiddlewareArgs, RespondArguments } from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';
import { dbDeleteEntry, dbWriteEntry, getDbEntryIndex, getSnykOrgIdByName, getSnykProjects, readFromDb } from '../utils';
import db from 'lowdb';
import { SnlackUser, SnykIssueSeverityCount } from '../../types';
import { projectListMsg } from '../messages';

export interface CommandRegisterFn {
  (slack: Slack): Promise<any>;
}

export interface CommandHandlerFn {
  (args: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>): Promise<void>;
}

export interface CommandInterface {
  command: string;
  registerCommand: CommandRegisterFn;
  commandHandler: CommandHandlerFn;
}

export class Command implements CommandInterface {
  public command: string;

  constructor(app: Slack) {
    this.command = '';
    this.registerCommand(app);
  }

  public registerCommand = async(app: Slack): Promise<void> => {
    app.command(this.command, async(args) => {
      this.commandHandler(args);
    });
  }

  public commandHandler = async (args: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>): Promise<void> => {
    await args.ack();
  }

}

export class SnykCommand extends Command {
  public command: string;

  constructor(slack: Slack) {
    super(slack);
    this.command = '/snyk';
    this.registerCommand(slack);
  }

  public commandHandler = async (args: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>): Promise<void> => {
    const {ack, command, respond} = args;
    await ack();

    console.log(`Handling the command ${this.command}`);

    const cmd : string = command.text.split(/\s+/)[0];
    const subcmd : string = command.text.split(/\s+/)[1];
    const param : string = command.text.split(/\s+/)[2];
    const param2 : string = command.text.split(/\s+/)[3];
    const param3 : string = command.text.split(/\s+/)[4];

    console.log();
    console.log('Received a command:');
    console.log('--------------------------');
    console.log('cmd:', cmd);
    console.log('cmd type:', typeof cmd);
    console.log('subcmd:', subcmd);
    console.log('param:', param);
    console.log('param2:', param2);
    console.log('param3:', param3);
    console.log('--------------------------');
    console.log();

    switch(cmd) {
      case 'org':
        this.orgHandler(subcmd);
        break;
      case 'app':
        if (subcmd === 'del') {
          // dbDeleteEntry({ table: 'users', key: 'user.id', value: 'U03SNLU01JA' });
          await dbDeleteEntry({ table: 'users', key: 'slackUid', value: 'U03SNLU01JA' });
        }
      case 'project':
        // `/snyk project` command entrypoint.
        if (typeof subcmd === 'undefined') {
          await respond('You probably meant to pass a parameter like `list`. Try this:\n \`\`\`/snyk project list\`\`\`\nor\n\`\`\`/snyk project list \'My Org Name\'\`\`\`');
        }
        //
        // List all the projects within Org (param);
        //
        else if (subcmd === 'list' && typeof param !== 'undefined') {
          // @ts-ignore
          console.problem('Attempting to handle a project list command with a given Org.');
          const orgId = await getSnykOrgIdByName(param);

          try {
            // See if there's an entry in the current lowdb file for a user that
            // matches the user calling the command.
            const existingEntryIndex: any = await getDbEntryIndex({ table: 'users', key: 'slackUid', value: command.user_id });

            // If there is such an entry...
            if (typeof existingEntryIndex !== 'undefined'
              && typeof existingEntryIndex !== 'boolean') {
              // Yoink the current db contents to peruse for projects.
              const dbContent = await readFromDb();

              // Since we know there's an existing entry, use its index in the
              // users table. This could probably be more elegant, but we're
              // just hacking for now.
              const existingEntry = dbContent.users[existingEntryIndex];

              if (typeof existingEntry.snykOrgs === 'undefined') throw `There was an error retrieving projects for ${param}. Namely, there are no Orgs at all...`;

              // Figure out the requested Org's index within the user entry.
              let entryOrgIndex: number | null = null;
              existingEntry.snykOrgs.map((org, index) => {
                if (org.id === orgId) entryOrgIndex = index;
              });

              // Throw an error if there's no matching Snyk organization
              // attached to this user.
              if (entryOrgIndex === null) throw `Could not find the requested Org in the list of Orgs this user may acces...`;


              // If we not only have an entry for the current user, but that
              // entry also contains an array of Snyk projects...
              if (typeof existingEntry.snykOrgs[entryOrgIndex] !== 'undefined' && existingEntry.snykOrgs[entryOrgIndex].projects.length >= 1) {
                // if (typeof existingEntry.snykProjects !== 'undefined' && existingEntry.snykProjects.length >= 1) {

                // We already have projects locally.  Generate a Slack block
                // array of the projects with contextual actions for the user.
                const msg = projectListMsg(existingEntry.snykOrgs[entryOrgIndex].projects, param, orgId, entryOrgIndex);

                // Send the message to the user or respond that there were no
                // projects in the given organization (`param`).
                try {
                  await respond(msg as RespondArguments);
                }
                catch (error) {
                  throw 'A response to the project list command could not be sent.'
                }
              }

              // If we have an entry for the current user, but there aren't any
              // Snyk projects in their lowdb entry...
              else {
                // @TODO update comment.
                // Look up the orgId for the org name given via the command's
                // `param` value.
                if (typeof orgId === 'string') {
                  // Call the Snyk API asynchronously using `getSnykProjects` and the orgId.
                  const remoteData = await getSnykProjects(command.user_id, existingEntry.snykTokenType as string, existingEntry.snykAccessToken as string, orgId as string);

                  // if (existingEntry.snykOrgs[entryOrgIndex].projects.length)

                  // Store whatever information that API call returned in the
                  // user's entry for next time.
                  existingEntry.snykOrgs[entryOrgIndex].projects = remoteData.projects;

                  // Store whatever information that API call returned in the
                  // user's entry for next time.
                  // existingEntry.snykProjects = remoteData.projects;

                  // To make life easier, let's add the org name and orgId to
                  // each project in  the entry as top-level keys for easier
                  // lookup / comparison.
                  existingEntry.snykOrgs[entryOrgIndex].projects.map(project => {
                    project.org = param;
                    project.orgId = orgId;
                  });

                  // Write to the lowdb file / save to the DB.
                  await dbWriteEntry({ table: 'users', data: existingEntry });

                  // Now that we have some data,
                  // Generate a Slack block array of the projects with
                  // contextual actions for the user.
                  const msg = projectListMsg(existingEntry.snykOrgs[entryOrgIndex].projects, param, orgId, entryOrgIndex);

                  // Send the message to the user.  The message should contain
                  // the list of projects in the given Snyk org or a statement
                  // letting them know that there were no projects in the given
                  // organization (provided by `param`).
                  // @ts-ignore
                  await respond(msg);
                }
              }
            }
          } catch (error) {
            console.error('Got an error handling Slack command: `/snyk project list <snyk org>`.');
            // @ts-ignore
            // console.error(error);
            throw error.data;
          }
        }
        // List all projects, regardless of Org
        if (subcmd === 'list' && typeof param === 'undefined') {

        }
        break;
      default:
        await respond('You gotta gimme something');
        break;
    }

  }

  private orgHandler = async (subcmd?: string) => {
    // const snykOrgs = await getSnykAppOrgs('bearer', );
    console.log('Gettin\' your orgs');
  }

}


//   public commandHandler = async ({ client, command }) => {

//   }

// }
// // class SlackCommand {
// //   constructor() {

// //   }

// //   private
// // }


// const generateProjectMsgBlocksLite = (project: SnykProjectMsgParts) => {
//   return {
//     blocks: [
//       {
//         type: 'section',
//         text: {
//           type: 'mrkdwn',
//           text: `\`${project.name}\``,
//         },
//         accessory: {
//           type: 'overflow',
//           options: [
//             {
//               text: {
//                 type: 'plain_text',
//                 text: 'View on Snyk.io',
//                 emoji: true
//               },
//               url: `${project.browseUrl}`
//             },
//             {
//               text: {
//                 type: 'plain_text',
//                 text: 'More details',
//                 emoji: true
//               },
//               value: 'proj-list-more-details'
//             },
//             {
//               text: {
//                 type: 'plain_text',
//                 text: 'Issue count',
//                 emoji: true
//               },
//               value: 'proj-list-issue-count'
//             }
//           ],
//           action_id: 'project_list_overflow_action'
//         }
//       },
//       // {
//       //   type: 'actions',
//       //   elements: [
//       //     {
//       //       type: 'button',
//       //       text: {
//       //         type: 'plain_text',
//       //         text: 'View Issues',
//       //         emoji: true
//       //       }
//       //     },
//       //     {
//       //       type: 'button',
//       //       text: {
//       //         type: 'plain_text',
//       //         text: 'Do something else',
//       //         emoji: true
//       //       }
//       //     },
//       //     {
//       //       type: 'overflow',
//       //       options: [
//       //         {
//       //           text: {
//       //             type: 'plain_text',
//       //             text: 'Do a thing',
//       //             emoji: true
//       //           },
//       //           value: 'value-0'
//       //         },
//       //         {
//       //           text: {
//       //             type: 'plain_text',
//       //             text: 'Do another thing',
//       //             emoji: true
//       //           },
//       //           value: 'value-1'
//       //         },
//       //         {
//       //           text: {
//       //             type: 'plain_text',
//       //             text: 'Another different thing',
//       //             emoji: true
//       //           },
//       //           value: 'value-3'
//       //         }
//       //       ]
//       //     }
//       //   ]
//       // },
//       // {
//       //   type: 'divider'
//       // }
//     ]
//   }
// }

//               // {
//               //   "id": "e414f05e-0039-4090-8321-8f310967477e",
//               //   "name": "carwin/qmk_firmware_flashbin:latest",
//               //   "created": "2022-08-15T16:14:51.787Z",
//               //   "origin": "docker-hub",
//               //   "type": "deb",
//               //   "readOnly": false,
//               //   "testFrequency": "daily",
//               //   "isMonitored": true,
//               //   "totalDependencies": 221,
//               //   "issueCountsBySeverity": {
//               //     "low": 13,
//               //     "high": 189,
//               //     "medium": 211,
//               //     "critical": 56
//               //   },
//               //   "imageId": "sha256:20c9c7769d773d1950035cd095cc80ee94e2fa6a3ca715197d495aae3264a9e6",
//               //   "imageTag": "latest",
//               //   "imagePlatform": "linux/amd64",
//               //   "lastTestedDate": "2022-08-31T00:17:14.829Z",
//               //   "browseUrl": "https://app.snyk.io/org/kuberneatos/project/e414f05e-0039-4090-8321-8f310967477e",
//               //   "owner": null,
//               //   "importingUser": {
//               //     "id": "b9fe8330-8291-4c48-9bce-2a60fdd7dc44",
//               //     "name": "Carwin Young",
//               //     "username": "carwin.young",
//               //     "email": "carwin.young@snyk.io"
//               //   },
//               //   "tags": [],
//               //   "attributes": {
//               //     "criticality": [],
//               //     "lifecycle": [],
//               //     "environment": []
//               //   },
//               //   "branch": null,
//               //   "targetReference": "latest",
//               //   "org": "Kuberneatos",
//               //   "orgId": "bb870d77-8300-42ae-a110-d200bedbdd7f"
//               // },
