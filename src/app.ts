/* eslint-disable no-console */
/* eslint-disable import/no-internal-modules */
import config from 'config';
import fs from 'fs';
import { join } from 'path';
import { envCheck, Severity } from 'envar-check';
import './lib/utils/env';
import { Envars, Config } from './lib/types';
import { App, LogLevel } from '@slack/bolt';
import { AuthController } from './lib/controllers/auth';

export const SNYK_API_BASE = config.get(Config.SnykApiBase);
export const SNYK_APP_BASE = config.get(Config.SnykAppBase);

console.log('Slack Bot Token: ', process.env.SLACK_BOT_TOKEN);
console.log('Slack Signing Secret: ', process.env.SLACK_SIGNING_SECRET);



const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  customRoutes: [
    AuthController
  ],
  logLevel: LogLevel.DEBUG,
  deferInitialization: true,
});

  // /**
  //  * Check all the required environmental variables are set or throw an error
  //  */
  // private checkEnvVars() {
  //   envCheck(
  //     [Envars.ClientId, Envars.ClientSecret, Envars.RedirectUri, Envars.Scopes, Envars.EncryptionSecret],
  //     Severity.FATAL,
  //   );
  // }

  /**
   * Initialize the database file to be used by our DB
   */
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


app.use(async ({ next }) => {
  await next();
});

// Listens to incoming messages that contain "hello"
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
    const result = await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        callback_id: 'home_view',
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Snyk Authentication"
            }
          },
          {
            "type": "divider",
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Before you can access your Snyk data, you'll need to authorize using OAuth2."
            }
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Authenticate with Snyk"
                },
                "url": "https://d14c-47-213-163-190.ngrok.io/auth",
              }
            ]
          }
        ]
      }
    })
  } catch (error) {
    console.error(error);
  }
});

app.action('button_click', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});


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
    // Start your app

  console.log(`⚡️ Bolt app is running on port ${process.env.PORT}`);
})();

export let dbPath: string;
