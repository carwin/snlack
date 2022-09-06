import { App as Slack, AllMiddlewareArgs, SlackCommandMiddlewareArgs, RespondArguments } from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';
import { dbDeleteEntry } from '../utils';
import { snykListCommandHandler } from './snykListProjects';

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

    const commandParts = {
      cmd,
      subcmd,
      param,
      param2,
      param3
    };

    switch(cmd) {
      case 'org':
        this.orgHandler(subcmd);
        break;
      case 'app':
        if (subcmd === 'del') {
          await dbDeleteEntry({ table: 'users', key: 'slackUid', value: 'U03SNLU01JA' });
        }
        break;

      case 'project':
        snykListCommandHandler(command, respond, commandParts);
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
