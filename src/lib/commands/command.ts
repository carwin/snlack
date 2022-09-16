// @TODO - This is now unused
/**
 * This class defines the core Command class.
 *
 * @category Commands
 *
 */
import { AllMiddlewareArgs, App as Slack, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { StringIndexed } from "@slack/bolt/dist/types/helpers";

export interface CommandRegisterFn {
  (slack: Slack): Promise<any>;
}

export interface CommandHandlerFn {
  // (args: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>): Promise<void>;
  (args: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>): Promise<void>;
}

export interface CommandInterface {
  command: RegExp;
  registerCommand: CommandRegisterFn;
  commandHandler: CommandHandlerFn;
}

export class Command implements CommandInterface {
  public command: RegExp;

  constructor(app: Slack) {
    this.command = RegExp(/^/);
    this.registerCommand(app);
  }

  public registerCommand = async(app: Slack): Promise<void> => {
    console.log('entering registerCommand with, ', this.command);
    if (typeof this.command !== 'undefined' && this.command) {
      app.command(this.command, async(args) => {
        console.log(`Registering command ${this.command}`);
        this.commandHandler(args);
      });
    }
  }

  public commandHandler = async (args: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>): Promise<void> => {
    console.log('hit the command handler')
    await args.ack();
  }

}
