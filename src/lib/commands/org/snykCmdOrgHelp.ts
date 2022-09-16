import { SlackCommandMiddlewareArgs } from '@slack/bolt';
import { orgHelpMsg } from '../../messages';
import { CmdHandlerFn } from '../snyk';

/** A simple help command to provide users information on using the Org level commands. */
// export const snykCmdOrgHelp: CmdHandlerFn = async(rawCommand, respond, {subcmd, ...params}) => {
export const snykCmdOrgHelp = async(input: string, args: SlackCommandMiddlewareArgs): Promise<void> => {

  console.log('Getting org help', input);
  const msg = orgHelpMsg();

  await args.respond(msg);
}
