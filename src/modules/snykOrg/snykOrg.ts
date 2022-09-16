import {App as Slack, AllMiddlewareArgs, SlackCommandMiddlewareArgs} from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';

import { snlack, Snlack } from '../../App';
import { snykCmdOrgHelp } from '../../lib/commands';

// SnykCommand singleton - they should all reference this.
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
      // I want to be able to add more and more handler functions to this instance here.
      // cmds.map( (cmd) => cmd(args); )
      this.handlers.map(({input, handler}) => {
        console.log('A: ', args.command.text.split(' ')[0]);
        console.log('B: ', input.split(' ')[0]);
        if (args.command.text.split(' ')[0] === input.split(' ')[0]) {
          handler(input, args);
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

