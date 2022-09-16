/**
 * @module snykCmdProjectHelp
 */
import { RespondArguments, RespondFn, SlashCommand } from "@slack/bolt";
import { SnykCommandParts } from '../../../types';
import { projectHelpMsg } from '../../messages';
import { CmdHandlerFn } from "../snyk";

/**
 * Command handler for `/snyk project help`
 *
 * @category Commands
 */
export const snykCmdProjectHelp: CmdHandlerFn = async(rawCommand: SlashCommand, respond: RespondFn, { subcmd, ...params}: SnykCommandParts): Promise<void> => {
  const msg: RespondArguments = projectHelpMsg();
  await respond(msg);
}
