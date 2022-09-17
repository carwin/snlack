import { orgHelpMsg } from '../../messages';
import { CmdHandlerFn } from '../../../types';
import { SlackCommandMiddlewareArgs } from '@slack/bolt';

// export const snykCmdOrgHelp: CmdHandlerFn = async(rawCommand, respond, {subcmd, ...params}) => {
/** A simple help command to provide users information on using the Org level commands. */
export const snykCmdOrgHelp = async(args: SlackCommandMiddlewareArgs): Promise<void> => {
  const msg = orgHelpMsg();

  await args.respond(msg);
}
