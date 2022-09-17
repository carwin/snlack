import { App as Slack } from '@slack/bolt';

/**
 * Handles the `auth_snyk` action
 *
 * @remarks
 * This doesn't do anything yet.
 **/
export const actionAuthSnyk = (slack: Slack) => {

  slack.action('auth_snyk', async ({ ack }) => {
    await ack();
  });

}
