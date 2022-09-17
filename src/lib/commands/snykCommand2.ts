import {App as Slack, AllMiddlewareArgs, SlackCommandMiddlewareArgs} from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';
import snlack, { Snlack } from '../../App';

/**
 * This is a test rewrite of SnykCommand as a singleton to avoid the issues
 * run into by multiple instances causing multiple event acknowledgements.
 *
 * Also its just kind of neat.
 */
export class SnykCommand3030 {
  private static instance: SnykCommand3030 | null = null;
  public rootCommand: string;
  private handlers: {input: string, handler: any}[];

  private constructor(snlack: Snlack) {
    this.rootCommand = '/snyk';
    this.registerCmd(snlack);
    this.handlers = [];
  }

  private registerCmd = async(snlack: Snlack): Promise<void> => {
    snlack.app.command(this.rootCommand, async(args: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>) => {
      args.ack();
      const [cmd, subcmd, ...params] = args.command.text.split(' ');
      // I want to be able to add more and more handler functions to this instance here.
      // cmds.map( (cmd) => cmd(args); )
      this.handlers.map(({input, handler}) => {
        const splitInput = input.split(' ');
        const [registeredCmd, registeredSubcmd, ...registeredParams] = splitInput;

        // If the first two parts of the command are the same, proceed.
        if (cmd === registeredCmd && subcmd === registeredSubcmd) {
          // If there is no third part, go ahead and invoke the handler.
          if (typeof params[0] === 'undefined' && typeof registeredParams[0] === 'undefined') {
            handler(args);
          }
          // The user added a third part, but we haven't registered any params directly... Run it.
          else if (typeof params[0] !== 'undefined' && typeof registeredParams[0] === 'undefined') {
            handler(args);
          }
          // If the user sent a third part and we DO have a registered third part, compare them before running it.
          else {

            if (params[0] === registeredParams[0]) {
              handler(args);
            }

          }
        }

      });

    })
  }

  public addCmd = (input: string, handler: any) => {
    this.handlers.push({input, handler});
  }

  public static getInstance(): SnykCommand3030 {
    if(!SnykCommand3030.instance) {
      console.log("Instantiating a new SnykCommand");
      SnykCommand3030.instance = new SnykCommand3030(snlack);
    } else {
      console.log("Returning existing SnykCommand");
    }
    return SnykCommand3030.instance;
  }

}
