import path, { join } from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { App as Slack, ExpressReceiver, LogLevel, FileInstallationStore, EventFromType, SlackEventMiddlewareArgs } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { MessageEvent as AllMessageEvents } from '@slack/bolt';
import { ClientRequest } from 'http';
import { SlackEventAdapter } from '@slack/events-api';


//local Imports
import { eventAppHomeOpened } from './lib/events/apphome/opened';
import { actionAuthSnyk } from './lib/actions/authSnyk';


// Tell the App where to look for .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Assign environment variables.
const appPort: string = process.env.PORT;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackClientId = process.env.SLACK_CLIENT_ID;
const slackClientSecret = process.env.SLACK_CLIENT_SECRET;
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackSocketToken = process.env.SLACK_SOCKET_TOKEN;

// Define scopes.
// - This is done in the UI for my own install, but necessary for distribution.
const slackScopes: string[] = [
  'channels:history',
  'channels:join',
  'channels:read',
  'chat:write',
  'chat:write.customize',
  'chat:write.public',
  'commands',
  'incoming-webhook',
  'mpim:history',
  'users:read',
  'users:read.email',
  'im:history',
  'groups:history',
  'app_mentions:read'
];

// Create an ExpressReceiver
const receiver = new ExpressReceiver({
  signingSecret: slackSigningSecret,
  clientId: slackClientId,
  clientSecret: slackClientSecret,
  stateSecret: 'super-duper-mega-secrets',
  scopes: slackScopes,
  installerOptions: {
    // If below is true, /slack/install redirects installers to the Slack authorize URL
    // without rendering the web page with "Add to Slack" button.
    // This flag is available in @slack/bolt v3.7 or higher
    // directInstall: true,
  },
  installationStore: new FileInstallationStore(),
});

// Create the Bolt App using the receiver.
const slack = new Slack({
  receiver,
  logLevel: LogLevel.DEBUG, // log at the App level.
});


// Slack interaction handling.
// slack.event('message', async ({ event, client }) => {
//   await client.chat.postMessage({
//     channel: event.channel,
//     text: 'Hi there!',
//   });
// });

// Slack Events
// ------------------------------------------------------------------------------
// app_home_opened
// app_mention
// message.app_home
// scope_granted
// scope_denied
// tokens_revoked
eventAppHomeOpened(slack);

// Slack Actions
// ------------------------------------------------------------------------------
actionAuthSnyk(slack);

// Set up other handling for other web requests as methods on receiver.router
receiver.router.get('/snyk/auth', (req, res) => {
  // You're working with an express req and res now.
  res.redirect('/snyk/stuff');
});

(async () => {
  await slack.start(3000);
  console.log('Express app is running');
})();

export let dbPath: string;
