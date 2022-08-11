/* eslint-disable no-console */
/* eslint-disable import/no-internal-modules */
import config from 'config';
import fs from 'fs';
import { join } from 'path';
import { envCheck, Severity } from 'envar-check';
import { ActionConstraints, App, Context, LogLevel, HomeView } from '@slack/bolt';

import passport from 'passport';
import { VerifyCallback } from 'passport-oauth2';
import SnykOAuth2Strategy, { ProfileFunc } from '@snyk/passport-snyk-oauth2';

import { getOAuth2 } from './lib/utils/OAuth2Strategy';
import './lib/utils/env';
import { createHome } from './appHome';
import { Envars, Config } from './lib/types';
import { AuthController, HomeController } from './lib/controllers/auth';

export const SNYK_API_BASE = config.get(Config.SnykApiBase);
export const SNYK_APP_BASE = config.get(Config.SnykAppBase);

console.log('Slack Bot Token: ', process.env.SLACK_BOT_TOKEN);
console.log('Slack Signing Secret: ', process.env.SLACK_SIGNING_SECRET);



//  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
//
//
//  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Bolt app client configuration
// -----------------------------
// - Bolt’s client is an instance of WebClient from the Node Slack SDK
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // processBeforeResponse: true,
  developerMode: true,
  extendedErrorHandler: true,
  // raise_error_for_unhandled_request: true,
  customRoutes: [
    AuthController,
    HomeController
  ],
  logLevel: LogLevel.DEBUG,
  deferInitialization: true,
});


// Initialize the database file to be used by our DB
// ------------------------------------------------------------------------------
const initDatabaseFile = () => {
  try {
    const dbFolder = join(__dirname, '../db');
    dbPath = join(dbFolder, 'db.json');
    console.log(`
Using db: ${dbPath}`);

    if (!fs.existsSync(dbPath)) {
      if (!fs.existsSync(dbFolder)) {
        fs.mkdirSync(dbFolder);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

// Snyk Auth middleware
// ------------------------------------------------------------------------------
// Global middleware to check whether the Snyk App has been authorized / bearer
// token is valid / etc.
const snykAuthCheck = async (args: {context: Context }) => {
  args.context.snykAuthorized = false;
}

app.use(async ({ context, next }) => {
  snykAuthCheck({context});
  await next();
})


// Sample trigger phrase listener
// ------------------------------------------------------------------------------
//  - Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
  console.log('I saw a message');
  // Filter out message events with subtypes (see https://api.slack.com/events/message)
  if (message.subtype === undefined || message.subtype === 'bot_message') {
    // say() sends a message to the channel where the event was triggered
    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hey there <@${message.user}>!`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Click Me',
            },
            action_id: 'button_click',
          },
        },
      ],
      text: `Hey there <@${message.user}>!`,
    });
  }
});

app.event('app_home_opened', async ({ event, client, context }) => {
  try {
    // context.snykAuthorized = typeof context.snykAuthorized !== 'undefined' ? true : false;
    const homeView :HomeView = await createHome({user: event.user});
    const result = await client.views.publish({
      user_id: event.user,
      view: homeView
    });
   } catch (error) {
    console.error(error);
  }
});

// Set up the listener for the Home's authorize button.
// ------------------------------------------------------------------------------
// - global middleware needs to determine whether we've authed with Snyk so that
//   context is available to the listener.
const AuthButtonConstraints :ActionConstraints = {
  block_id: 'homeblock1',
  action_id: 'auth_snyk',
  type: 'block_actions',
};

app.action(AuthButtonConstraints, async ({ body, context, ack }) => {
  await ack();
  console.log('these are the constraints!');
  console.log('body: ', body);
  console.log('------------\nSnyk authorization status: ', context.snykAuthorized, '\n------------');

  if (context.snykAuthorized === false) {
    // Start authorizing
  } else {
    // Swap the auth button for a nice "You're all set" type of message
  }


});


// Initialize the Bolt app.
// ------------------------
(async () => {
  try {
    envCheck(
      [Envars.SnykClientId, Envars.SnykClientSecret, Envars.SnykRedirectUri, Envars.SnykScopes, Envars.SnykEncryptionSecret],
      Severity.FATAL,
    );
    initDatabaseFile();

    await app.init();
    await app.start(Number(process.env.PORT) || 4000);

  } catch (error) {
    console.log('There was an error during initialization:', error);
    process.exit(1);
  }
  console.log(`⚡️ Bolt app is running on port ${process.env.PORT}`);
})();

export let dbPath: string;
