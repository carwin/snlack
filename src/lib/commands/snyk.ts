import { App as Slack, AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';
import { dbDeleteEntry, dbWriteEntry, getDbEntryIndex, getSnykOrgIdByName, getSnykProjects, readFromDb } from '../utils';
import db from 'lowdb';
import { SnlackUser } from '../../types';

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

    await respond('Hey bud.');

    switch(cmd) {
      case 'org':
        this.orgHandler(subcmd);
        break;
      case 'app':
        if (subcmd === 'del') {
          dbDeleteEntry({ table: 'slackAppInstalls', key: 'user.id', value: 'U03SNLU01JA' });
          dbDeleteEntry({ table: 'users', key: 'slackUid', value: 'U03SNLU01JA' });
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
          try {
            const existingEntryIndex: any = await getDbEntryIndex({ table: 'users', key: 'slackUid', value: command.user_id });

            if (existingEntryIndex && typeof existingEntryIndex !== 'boolean') {
              const dbContent = await readFromDb();
              const existingEntry = dbContent.users[existingEntryIndex];
              console.log('Existing Entry::::::::::', existingEntry);

              if (typeof existingEntry.snykProjects !== 'undefined' && existingEntry.snykProjects.length >= 1) {
                // We already have projects locally.
                console.log('existingEntry.snykProjects is not undefined.');
                let message = '';
                existingEntry.snykProjects.forEach((proj) => {
                  if (proj.name === param) {
                    message += `${proj.name}\n`;
                  }
                });

                console.log('The param was: ', param);
                console.log('Here is the final message: ', message);

                await respond(message || `No projects in the ${param} organization.`);

              } else {
                console.log('We have an entry, but no snyk projects');
                // We have an entry but no projects.
                const orgId = await getSnykOrgIdByName(param);
                console.log(`Looked up orgID for ${param}: ${orgId}`);
                if (typeof orgId === 'string') {
                  const remoteData = await getSnykProjects(command.user_id, existingEntry.snykTokenType as string, existingEntry.snykAccessToken as string, orgId as string);
                  existingEntry.snykProjects = remoteData.projects;
                  existingEntry.snykProjects.map( (proj) => {
                    proj.org = param;
                    proj.orgId = orgId;
                  } )
                  await dbWriteEntry({ table: 'users', data: existingEntry });
                }
              }
            }
          } catch (error) {
            console.error('Got an error handling Slack command: `/snyk project list <snyk org>`.');
            throw error;
          }
        }
        // List all projects, regardless of Org
        if (subcmd === 'list' && typeof param === 'undefined') {

        }

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
