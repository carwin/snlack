import { RespondArguments, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { getSnykOrgInfo } from '../../utils';

/** Slack slash command handler function for `/snyk org info <MyOrg>` */
export const snykCmdOrgInfo = async (args: SlackCommandMiddlewareArgs) => {
  const rawCommandParts = args.command.text.split(' ');
  const [cmd, subcmd, ...params] = rawCommandParts;

  // User wants info on an org but neglected to give us a name or UUID.
  if (subcmd === 'info' && typeof params[0] === 'undefined') {
    await args.respond(`To get info on an organization you'll have to pass along the Org ID or name. See \`/snyk org help\` for more info.`);
  }

  if (subcmd === 'info' && typeof params[0] !== 'undefined') {

    try {
      const response = await getSnykOrgInfo(params[0], args.command.user_id) as RespondArguments;
      console.log('RESPONSE', response.blocks);
      await args.respond(response);
    }
    catch(error) {
      await args.respond(`There was an issue fetching details for the Snyk organization: ${params[0]}.`);
      console.error(`There was an error in snykCmdOrgInfo()...`, error);
    }
  }
}
