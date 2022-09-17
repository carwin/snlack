import { App as Slack } from '@slack/bolt';
import { SnlackEvent } from '../../../types';
import { SlackHomeView } from '../../views/appHome';

export const eventAppHomeOpened: SnlackEvent = (slack: Slack): void => {
    slack.event('app_home_opened', async ({ event, client, context }) => {
      console.log(`@${event.user} opened the Home tab`);
      try {
        const slackAppHome: SlackHomeView = new SlackHomeView({user: event.user});
        const view = await slackAppHome.createHome({});
        await client.views.publish(view);
      } catch (error) {
        console.error(error);
        // @ts-ignore
        console.log(error.data.response_metadata.messages);
      }
    });
}
