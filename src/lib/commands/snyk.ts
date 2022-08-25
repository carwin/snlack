import { App as Slack, AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';
import { dbDeleteEntry, readFromDb } from '../utils';

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
