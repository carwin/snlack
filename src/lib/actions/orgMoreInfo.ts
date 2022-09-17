import { App as Slack, RespondArguments } from '@slack/bolt';
import { state } from '../../App';
import { SnlackUser } from '../../types';
import { dbReadEntry, dbWriteEntry, getSnykAppOrgs, getSnykOrgInfo } from '../utils';

export const actionOrgMoreInfo = async(slack: Slack) => {
  // const parsedOrgId = args.payload.value.text.split('--')[1];
  slack.action('org-more-info', async(args) => {
    await args.ack();
    state.changeUser(args.body.user.id);

    if (args.payload.type === 'button') {
      const parsedOrgId = args.payload.value.split('--')[1];
      console.log('parsed id', parsedOrgId);
      const response = await getSnykOrgInfo(parsedOrgId, args.body.user.id) as RespondArguments;

      await args.respond(response);
    }


  });
}
