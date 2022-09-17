import { App as Slack } from '@slack/bolt';
import { state } from '../../App';
import { AppHomeConfigViewSnykModal } from '../views';

/**
 * Handles the `config_snyk` action.
 *
 * @remarks
 * This action is triggered when a user clicks a particular button on the App's
 * Home view.
 *
 * @see {@link snykPreAuthController}
 **/
// @TODO: Figure out how to link the @see statement in the typedoc comment.
export const actionConfigSnyk = (slack: Slack) => {
  slack.action('config_snyk', async ({ ack, body, client }) => {

    // Acknowledge the reception of payload.
    await ack();

    // User is changed here in response to the action event.
    // While this is happening the user is also hitting the /preauth route controller
    // then the /auth controller and axios interceptors.
    state.changeUser(body.user.id);

    try {
      const snykConfigView: AppHomeConfigViewSnykModal = new AppHomeConfigViewSnykModal({user: body.user.id, snykAuthStatus: false});
      // @ts-ignore
      const view = snykConfigView.view;

      const modalPayload = {
        // @ts-ignore
        trigger_id: body.trigger_id, // @TODO: Fix @ts-ignore
        view,
      }

      // Open the modal view.
      await client.views.open(modalPayload);

    } catch (error) {
      console.error('Error in actionConfigSnyk()', error);
      throw error;
    } finally {
      console.log(`Leaving actionConfigSnyk()...`);
    }
  });
}
