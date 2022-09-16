import { CmdHandlerFn } from "../snyk";
import { SnlackUser, SnykCommandParts, SnykOrg } from '../../../types';
import { validate as uuidValidate } from 'uuid';
import { dbReadEntry } from "../../utils";
import { orgInfoMsg } from "../../messages/cmds/org/orgInfoMsg";


export const snykCmdOrgInfo: CmdHandlerFn = async(rawCommand, respond, {subcmd, ...params}: SnykCommandParts) => {

  // User wants info on an org but neglected to give us a name or UUID.
  if (subcmd === 'info' && typeof params[0] === 'undefined') {
    await respond(`To get info on an organization you'll have to pass along the Org ID or name. See \`/snyk org help\` for more info.`);
  }

  if (subcmd === 'info' && typeof params[0] !== 'undefined') {
    const orgParamIsUUID = uuidValidate(params[0]);

    const userEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: rawCommand.user_id }) as SnlackUser;

    if (userEntry && typeof userEntry !== 'undefined') {
      const orgIndexMatch = (org: SnykOrg) => orgParamIsUUID ? org.id === params[0] : org.name === params[0];

      const orgIndex = userEntry.snykOrgs?.findIndex(orgIndexMatch);

      if (typeof orgIndex !== 'undefined') {
        const org = userEntry.snykOrgs![orgIndex];

        // const msg = orgInfoMsg(org, rawCommand.user_id);
        const msg = orgInfoMsg(org, orgIndex, userEntry);

        await respond(msg);

      }

    }
    else {
      await respond(`There are no Orgs attached to your user. Try authenticating with Snyk from the App's configuration page.`);
    }

  }

}
