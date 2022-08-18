// Handy reference:
//  -

import { App as Slack, ExpressReceiver, LogLevel } from '@slack/bolt';
import * as dotenv from 'dotenv';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import expressSession from 'express-session';
import * as fs from 'fs';
import passport from 'passport';
import path, { join } from 'path';
import * as db from './lib/utils/db';
import { SlackInstallData } from './types';
import {v4 as uuidv4} from 'uuid';

//local Imports
import { actionAuthSnyk } from './lib/actions/authSnyk';
import { eventAppHomeOpened } from './lib/events/apphome/opened';
import { redirectError } from './lib/middleware/redirectError';
import { getSnykOAuth2 } from './lib/utils/snykOAuth2Strategy';

// Tell the App where to look for .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Assign environment variables.
const appPort: string = process.env.PORT;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackClientId = process.env.SLACK_CLIENT_ID;
const slackClientSecret = process.env.SLACK_CLIENT_SECRET;
// const slackBotToken = process.env.SLACK_BOT_TOKEN;
// const slackSocketToken = process.env.SLACK_SOCKET_TOKEN;
export const SNYK_API_BASE = 'https://api.snyk.io';
export const SNYK_APP_BASE = 'https://app.snyk.io';

// Initialize our persistent JSON file store / pseudo-database.
// We should do something else in production.
export let dbPath: string;

try {
  const dbFolder = join(__dirname, '../db');
  dbPath = join(dbFolder, 'db.json');
  console.log(`Using db: ${dbPath}`);
  if (!fs.existsSync(dbPath)) {
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder);
    }
  }
} catch (error) {
  console.error('Could not initialize DB. Process failed with the following error: ', error);
}


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

console.log('slack client id:', slackClientId);
console.log('slack client secret:', slackClientSecret);

// Create an ExpressReceiver
const receiver = new ExpressReceiver({
  signingSecret: slackSigningSecret,
  clientId: slackClientId,
  clientSecret: slackClientSecret,
  stateSecret: 'super-duper-mega-secrets',
  scopes: slackScopes,
  customPropertiesExtractor: (req) => {
    return {
      "headers": req.headers,
      "foo": "bar",
    };
  },
  // redirectUri: 'https://972c-47-213-163-190.ngrok.io/slack/oauth_redirect',
  installerOptions: {
    // If below is true, /slack/install redirects installers to the Slack authorize URL
    // without rendering the web page with "Add to Slack" button.
    // This flag is available in @slack/bolt v3.7 or higher
    directInstall: false,
    // metadata: 'This is used to pass around session data',
    // redirectUriPath: '/slack/oauth_redirect', // Requires that redirectUri be passed to the receiver as well.
  },
  // installationStore: new FileInstallationStore(),
  installationStore: {
    storeInstallation: async (installation) => {
      try {
        let newData: SlackInstallData = {
          date: new Date(),
          installation,
          enterpriseId: installation.isEnterpriseInstall ? typeof installation.enterprise !== 'undefined' ? installation.enterprise.id : undefined : undefined,
          teamId: !installation.isEnterpriseInstall ? installation.team?.id : undefined,
          userId: installation.user.id
        };
        return db.writeToDb(null, newData);
      } catch (error) {
        console.log('Error saving Slack App installation data', error);
        throw new Error('Failed saving installation data to installationStore');
      }
    },
    // takes in an installQuery as an argument
    // installQuery = {teamId: 'string', enterpriseId: 'string', userId: 'string', conversationId: 'string', isEnterpriseInstall: boolean};
    // returns installation object from database
    fetchInstallation: async (installQuery) => {
      try {
        if (installQuery.isEnterpriseInstall && typeof installQuery.enterpriseId !== 'undefined') {
          //   // org wide app installation lookup
          return await db.getDbRecordByKey({ recordType: 'slack', queryKey: 'enterpriseId', queryVal: installQuery.enterpriseId });
        }
        if (typeof installQuery.teamId !== 'undefined') {
          console.log('Got asked for a DB lookup on Slack team ID');
          return await db.getDbRecordByKey({ recordType: 'slack', queryKey: 'teamId', queryVal: installQuery.teamId });
        }
      } catch (error) {
        console.log('Got an error fetching installation data: ', error);
        throw new Error(`Failed fetching installation: ${error}`);
      }
    },
    // takes in an installQuery as an argument
    // installQuery = {teamId: 'string', enterpriseId: 'string', userId: 'string', conversationId: 'string', isEnterpriseInstall: boolean};
    // returns nothing
    // @TODO
    deleteInstallation: async (installQuery) => {
      // replace myDB.get with your own database or OEM getter
      if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
        // org wide app installation deletion
        // return await myDB.delete(installQuery.enterpriseId);
      }
      if (installQuery.teamId !== undefined) {
        // single team app installation deletion
        // return await myDB.delete(installQuery.teamId);
      }
      throw new Error('Failed to delete installation');
    },

  }
});

// Create the Bolt App using the receiver.
const slack = new Slack({
  receiver,
  logLevel: LogLevel.DEBUG, // log at the App level.
});

// @TODO: I don't remember why I added this.
slack.use(async ({ logger, context, next }) => {
  logger.info(context);
  await next();
})

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

// Middleware?
const initializePassport = (receiver: ExpressReceiver) => {

  console.log(`Initializing Passport.`);

  passport.use(getSnykOAuth2());
  receiver.router.use(passport.initialize());
  receiver.router.use(passport.session());
  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });
  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

};

const passportAuthenticate = () => {
  console.log('Now triggering passport.authenticate()');
  return passport.authenticate('snyk-oauth2', {
    successRedirect: '/snyk/callback/success',
    failureRedirect: '/snyk/callback/failure',
  });
}

/**
 * Handle the success response of authentication
 * @returns The callback EJS template
 */
const snykAuthSuccess = async (req: Request, res: Response, next: NextFunction) => {
  console.log('Hit the /snyk/callback/success route.');
  console.log('SNYK AUTH SUCCESS.');
  return res.sendStatus(200);
}
/**
 * Handle the failure response of authentication
 * @returns Sends error through the next function to the
 * error handler middleware
 */
const snykAuthFailure = (req: Request, res: Response, next: NextFunction) => {
  console.log('Hit the /snyk/callback/failure route.');
  console.log('SNYK AUTH FAILURE.');
  return res.sendStatus(401);
  // return next(new HttpException(401, 'Snyk Authentication failed'));
}


initializePassport(receiver);
receiver.router.use(express.json());
receiver.router.use(express.urlencoded({ extended: true }));
receiver.router.use(expressSession({ secret: uuidv4(), resave: false, saveUninitialized: true }));

// App Routes
// ------------------------------------------------------------------------------
// Set up other handling for other web requests as methods on receiver.router
receiver.router.get('/snyk/preauth', async (req, res) => {
  console.log('Pre auth time.');
  res.redirect('/snyk/auth');
});

// receiver.router.get('/snyk/auth', async (req, res, next) => {
//   console.log('Now we\'re on /snyk/auth');
//   // You're working with an express req and res now.
//   // res.redirect('/snyk/stuff');
//   // https://app.snyk.io/oauth2/authorize?response_type=code&client_id={clientId}&redirect_uri={redirectURI}&scope={scopes}&nonce={nonce}&state={state}&version={version}
//   passport.authenticate('snyk-oauth2');
//   res.sendStatus(200);

// });
receiver.router.get(`/snyk/auth`, passport.authenticate('snyk-oauth2'));

receiver.router.get(`/synk/callback`, redirectError, passportAuthenticate);
// receiver.router.get('/snyk/callback', async (req, res) => {
//   console.log('Hit the /snyk/callback route.');
//   res.sendStatus(200);
// });

receiver.router.get('/snyk/callback/success', snykAuthSuccess);
receiver.router.get('/snyk/callback/failure', snykAuthFailure);


// receiver.router.get('/slack/auth', (req, res) => {
//   // You're working with an express req and res now.
//   // res.redirect('/snyk/stuff');
//   // installProvider.handleCallback(req, res);
// });



(async () => {
  await slack.start(appPort);
  console.log('Express app is running');
})();
