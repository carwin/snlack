import { AllMiddlewareArgs, App as Slack, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';
import { dbDeleteEntry } from '../utils';
import { snykProjectHelpCommandHandler } from './snykProjectHelp';
import { snykProjectIssuesCommandHandler } from './snykGetProjectIssues';
import { snykListProjectsCommandHandler } from './snykListProjects';
import { snykListOrgsCommandHandler } from './snykListOrgs';

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
        if (subcmd === 'list') snykListOrgsCommandHandler(command, respond, commandParts);
        break;
      case 'app':
        if (subcmd === 'del') {
          await dbDeleteEntry({ table: 'users', key: 'slackUid', value: 'U03SNLU01JA' });
        }
        break;

      case 'project':
        if (typeof subcmd === 'undefined') snykProjectHelpCommandHandler(command, respond, commandParts);
        if (subcmd === 'help') snykProjectHelpCommandHandler(command, respond, commandParts);
        if (subcmd === 'list') snykListProjectsCommandHandler(command, respond, commandParts);
        if (subcmd === 'issues') snykProjectIssuesCommandHandler(command, respond, commandParts);
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
