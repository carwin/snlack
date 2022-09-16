import { orgHelpMsg } from '../../messages';
import { CmdHandlerFn } from '../snyk';

/** A simple help command to provide users information on using the Org level commands. */
export const snykCmdOrgHelp: CmdHandlerFn = async(rawCommand, respond, {subcmd, ...params}) => {
  console.log('Getting org help');
  const msg = orgHelpMsg();

  await respond(msg);
}
