import { RespondArguments } from '@slack/bolt';
import { SnykCommandParts } from '../../../types';
import { createProjectDetailsBlock, getProjectIndexForEntry, getProjectParentOrgIndexForEntry } from '../../utils';
import { CmdHandlerFn } from '../../../types';

/** Command handler for `/snyk project info`. Returns a set of detail blocks. */
export const snykCmdProjectInfo: CmdHandlerFn = async(rawCommand, respond, {subcmd, ...params}: SnykCommandParts): Promise<void> => {

  if (typeof params[0] !== 'undefined') {
    // const parentOrgIndex = getProjectParentOrgIndexForEntry(params[0]);
    const parentOrgIndex = await getProjectParentOrgIndexForEntry(params[0]);
    const projectIndex = await getProjectIndexForEntry(params[0]);

    if ((typeof parentOrgIndex !== 'undefined' && parentOrgIndex >= 0)
      && (typeof projectIndex !== 'undefined' && projectIndex >= 0)) {

      const msg = await createProjectDetailsBlock(rawCommand.user_id, parentOrgIndex, projectIndex) as RespondArguments;

      await respond(msg);
    }
  }
  else {
    await respond(`You'll need to pass a Snyk project name or ID for that command to work! See \`/snyk project help\` for more information.`);
  }
}
