/**
 * @module snykCmdProjectHelp
 */
import { RespondArguments, SlackCommandMiddlewareArgs } from "@slack/bolt";
import { CmdHandlerFn, SnykCommandParts } from '../../../types';
import { projectHelpMsg } from '../../messages';

/**
 * Command handler for `/snyk project help`
 *
 * @category Commands
 */
export const snykCmdProjectHelp = async (args: SlackCommandMiddlewareArgs) => {
  const msg: RespondArguments = projectHelpMsg();
  await args.respond(msg);
}
