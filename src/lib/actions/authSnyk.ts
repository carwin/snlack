// import passport from 'passport';
// @TODO - Remove or clean this file up, its non-functional right now.
import { ExpressReceiver, App, ActionConstraints, AckFn, Context } from '@slack/bolt';

// Set up the listener for the Home's authorize button.
// ------------------------------------------------------------------------------
// - global middleware needs to determine whether we've authed with Snyk so that
//   context is available to the listener.
const AuthButtonConstraints :ActionConstraints = {
  block_id: 'homeblock1',
  action_id: 'auth_snyk',
  type: 'block_actions',
};

// async({ client, command }: { client: any; command: any; })
const authButtonHandler = async({ receiver, context }: {receiver: ExpressReceiver, context?: Context }) => {
  console.log('these are the constraints!');
  console.log('------------\nSnyk authorization status: ', context?.snykAuthorized, '\n------------');

  if (context?.snykAuthorized === false) {
    // Start authorizing
    try {
      console.log('calling passport.authenticate');
    } catch (error) {
      console.error('Whoa! Error with passport.authenticate', error);
    }
  } else {
    // Swap the auth button for a nice "You're all set" type of message
    console.log('Snyk is authorized. Neat.');
  }
};

export const authButtonAction = async(app: any) => {
  // @ts-ignore
  app.action(AuthButtonConstraints, async ({ context, ack }) => {

    // Acknowledge command request
    await ack();
    // @TODO I stopped here!
    console.log('can we access signing sec?: ', process.env.SLACK_SIGNING_SECRET);
    // @ts-ignore
    const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET<String> });
    // authButtonHandler({client, command});
    authButtonHandler({ receiver, context});

  });
}
