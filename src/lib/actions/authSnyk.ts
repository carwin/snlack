import { App as Slack } from '@slack/bolt';

export const actionAuthSnyk = (slack: Slack) => {

  slack.action('auth_snyk', async ({ ack, context, body, payload }) => {
    ack();
    console.log('Hey, the auth button was clicked!');
    console.log(`here is the payload: ${Object.keys(payload)}`);
    console.log(`Payload Type: ${payload.type}`);
    // @ts-ignore
    console.log(`Payload action ID: ${payload.action_id}`);
    // @ts-ignore
    console.log(`Payload Value: ${payload.value}`);
    console.log(`here is the body: ${Object.keys(body)}`);
    console.log(`User: ${body.user}`);
    console.log(`Type: ${body.type}`);
    console.log(`Team: ${body.team}`);
  });
}
