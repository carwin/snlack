/**
 * @module snykCmdProjectHelp
 */
import { RespondArguments } from "@slack/bolt";
import { CmdHandlerFn, SnykCommandParts } from '../../../types';
import { projectHelpMsg } from '../../messages';

/**
 * Command handler for `/snyk project help`
 *
 * @category Commands
 */
export const snykCmdProjectHelp: CmdHandlerFn = async(rawCommand, respond, { subcmd, ...params}: SnykCommandParts): Promise<void> => {
  const msg: RespondArguments = projectHelpMsg();
  await respond(msg);
}
