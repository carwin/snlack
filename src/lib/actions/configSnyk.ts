import { App as Slack, ModalView, View } from '@slack/bolt';
import { Application } from 'express';
import { readFromDb, writeToDb, dbReadEntry } from '../utils';
import { AppHomeConfigView } from '../views';

export const actionConfigSnyk = (slack: Slack, expressApp: Application) => {

  slack.action('config_snyk', async ({ ack, context, body, payload, client }) => {
    await ack();

    context.slackUserId = body.user.id;
      // @ts-ignore
    console.log('Hey, the auth button was clicked!');
    console.log(`here is the payload: ${Object.keys(payload)}`);
    console.log(`Payload Type: ${payload.type}`);
    // @ts-ignore
    console.log(`Payload action ID: ${payload.action_id}`);
    // @ts-ignore
    console.log(`Payload action ID: ${payload.trigger_id}`);
    // @ts-ignore
    console.log(`Payload Value: ${payload.value}`);
    console.log(`here is the body: ${Object.keys(body)}`);
    console.log(`User: ${body.user}`);
    console.log(`Type: ${body.type}`);
    console.log(`Team: ${body.team}`);

    try {
      const snykConfigView: AppHomeConfigView = new AppHomeConfigView({user: body.user.id, snykAuthStatus: false});
      // @ts-ignore
      const view = snykConfigView.view;
      console.log('view?', view);

      const modalPayload = {
      // @ts-ignore
        trigger_id: body.trigger_id,
        view,
      }
      console.log('Modal Payload', modalPayload);
        // @ts-ignore
      await client.views.open(modalPayload);

      const dbData = await readFromDb();

      // if (typeof dbData[body.user.id] !== 'undefined') {
      //   // User already in Users array
      // } else {
      //   writeToDb(null, null, body.user.id);
      // }

    } catch (error) {
      // @ts-ignore
      // console.log('error in snyk config view action', error.data.response_metadata.messages);
      console.log('error in snyk config view action', error);
    }
  });
}
