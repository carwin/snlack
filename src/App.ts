import { App as Slack, ExpressReceiver, LogLevel } from '@slack/bolt';
import { Installation } from '@slack/bolt';
import * as dotenv from 'dotenv';
import type { Application, NextFunction, Request, Response } from 'express';
import express from 'express';
import expressSession from 'express-session';
import * as fs from 'fs';
import type { Server } from 'http';
import passport from 'passport';
import path, { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as db from './lib/utils/db';
import { SlackInstallData, SnlackUser } from './types';

//local Imports
import rateLimit from 'express-rate-limit';
import { actionAuthSnyk } from './lib/actions/authSnyk';
import { AppIndexController, SnykAuthCallbackController, SnykAuthController, SnykPreAuthController } from './lib/controllers';
import { eventAppHomeOpened } from './lib/events/apphome/opened';
import { HTTPException } from './lib/exceptions';
import { redirectError, requestError } from './lib/middleware';
import { getSnykOAuth2 } from './lib/utils';
import { Controller } from './types';

// Tell the App where to look for .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Assign environment variables.
// ------------------------------------------------------------------------------
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackClientId = process.env.SLACK_CLIENT_ID;
const slackClientSecret = process.env.SLACK_CLIENT_SECRET;
// const slackBotToken = process.env.SLACK_BOT_TOKEN;
// const slackSocketToken = process.env.SLACK_SOCKET_TOKEN;
export const SNYK_API_BASE = 'https://api.snyk.io';
export const SNYK_APP_BASE = 'https://app.snyk.io';

// Define scopes.
// ------------------------------------------------------------------------------
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


// Application class definition
// ------------------------------------------------------------------------------
/**
 * The primary entrypoint / basis for the application.
 *
 * @category root
 * */
export class Snlack {
  /** A public Express.js app instance. */
  public expressApp: Application;
  /** A public Bolt app instance. */
  public app: Slack;
  /**
   * A private server property which likely has no need to be accessed and
   * thus defines no getter or setter.
   **/
  private server: Server | Promise<any>;

  constructor(controllers: Controller[], port: number) {
    this.initStorage();

    // First initialize a Bolt receiver (ExpressReceiver).
    const receiver = this.initExpressReceiver()

    this.expressApp = receiver.app;

    // Create the Bolt App, using the receiver.
    this.app = this.initBoltApplication(receiver);


    // Initialize our global middleware. There's a decent chunk.
    this.initGlobalMiddleware();
    // We implement/abstract a Controller type for managing routes and
    // their associated handlers.
    // The important thing to know here is that these are typically outside
    // of the Bolt app. Slack interactions are methods on this.app. Other
    // web requests are methods on receiver.router.
    //
    // There's more info on this page, though the relevant bits are collapsed
    // by default when you go to the page. Look for "Custom ExpressReceiver routes."
    //
    // @see https://slack.dev/bolt-js/concepts#custom-routes
    //
    this.initRoutes(controllers);
    this.initErrorHandler();

    this.server = this.listen(port || 3000);
  }

  private initStorage = () => {
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
  }

  private initBoltApplication = (receiver: ExpressReceiver) => {
    // Create the Bolt App using the receiver.
    const slack = new Slack({
      receiver,
      logLevel: LogLevel.DEBUG, // log at the App level.
    });

    eventAppHomeOpened(slack);
    actionAuthSnyk(slack);

    slack.command('/snyk', async ({ command, ack, respond }) => {
      await ack();

      const cmd : string = command.text.split(/\s+/)[0];
      const subcmd : string = command.text.split(/\s+/)[1];
      const param : string = command.text.split(/\s+/)[2];
      const param2 : string = command.text.split(/\s+/)[3];
      const param3 : string = command.text.split(/\s+/)[4];

      console.log();
      console.log('Received a command:');
      console.log('--------------------------');
      console.log('cmd:', cmd);
      console.log('cmd type:', typeof cmd);
      console.log('subcmd:', subcmd);
      console.log('param:', param);
      console.log('param2:', param2);
      console.log('param3:', param3);
      console.log('--------------------------');
      console.log();

      switch (cmd) {
        case 'org':
          if (subcmd === 'show') {
            await respond(`The current Snyk Organization context for commands is: @TODO YOUR_ORG`);
          }
          if (subcmd === 'switch') {

            if (typeof param === 'undefined') {
              await respond(`To switch your current Snyk Organization, provide its name as a parameter to this command.`);
            } else {
              // @TODO - gotta actually make sure it exists, and also be able to store context state.
              await respond(`Okay, switching context to ${param}`);
            }

          }
          break;
        case 'orgs':
          if (subcmd === 'list') {
            const data = db.readFromDb();

            const orgs = (await data).snykAppInstalls[0].orgs;
            let orgString = '';
            orgs.map((org) => {
              orgString += org.name + ' ';
            });
            await respond(`I know about these orgs: ${orgString}`);
          } else {
            await respond(`You probably want your Snyk orgs. Try \`/snyk orgs list\`.`);
          }
          break;
        case 'projects':
          await respond(`You want your Snyk orgs.`);
          break;
        default:
          await respond(`Thanks for flying Snyk (unofficial)`);
      }

      // await respond(`${command.text}`);
    });

    return slack;
  }

  private initExpressReceiver = () => {

    const receiver = new ExpressReceiver({
      signingSecret: slackSigningSecret,
      clientId: slackClientId,
      clientSecret: slackClientSecret,
      stateSecret: 'super-duper-mega-secrets',
      // app: this.app,
      scopes: slackScopes,
      processBeforeResponse: true,
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
            let userInstallData: SnlackUser = {
              slackUid: installation.user.id,
              slackInstallationDate: new Date(),
              slackTeamId: !installation.isEnterpriseInstall ? installation.team?.id : undefined,
              slackTeamName: !installation.isEnterpriseInstall ? installation.team?.name : undefined,
              slackEnterpriseId: installation.isEnterpriseInstall ? typeof installation.enterprise !== 'undefined' ? installation.enterprise.id : undefined : undefined,
              slackEnterpriseUrl: installation.isEnterpriseInstall ? typeof installation.enterprise !== 'undefined' ? installation.enterpriseUrl : undefined : undefined,
            };

            let appInstallData: Installation = installation;

            return db.dbWriteSlackInstallEntries(userInstallData, appInstallData);

          } catch (error) {
            console.log('Error saving Slack App installation data', error);
            throw new Error(`Failed saving installation data to installationStore: ${error}`);
          }
        },
        // takes in an installQuery as an argument
        // installQuery = {teamId: 'string', enterpriseId: 'string', userId: 'string', conversationId: 'string', isEnterpriseInstall: boolean};
        // returns installation object from database
        // @ts-ignore
        fetchInstallation: async (installQuery) => {
          try {
            if (installQuery.isEnterpriseInstall && typeof installQuery.enterpriseId !== 'undefined') {
              // org wide app installation lookup
              return await db.dbReadEntry({ table: 'slackAppInstalls', key: 'slackEnterpriseId', value: installQuery.enterpriseId });
            }
            if (typeof installQuery.teamId !== 'undefined') {
              return await db.dbReadEntry({ table: 'slackAppInstalls', key: 'team.id', value: installQuery.teamId });
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
    return receiver;

  }

  private initRoutes(controllers: Controller[]) {

    controllers.forEach((controller: Controller) => {
      // @TODO - hmm....
      this.expressApp.use('/', controller.router);
    })

  }


  private listen = async(port: number) => {
    await this.app.start(port || process.env.PORT || 3000);
    console.log('Bolt on.');
  }

  private initGlobalMiddleware() {
    // this.app.use('/slack/events', this.receiver.router);

    this.expressApp.use(express.json());
    this.expressApp.use(express.urlencoded({ extended: true }));
    // this.app.use('/public', express.static(path.join(__dirname, '/public')));
    this.expressApp.use(expressSession({ secret: uuidv4(), resave: false, saveUninitialized: true }));
    // this.app.use(
    //   helmet({
    //     contentSecurityPolicy: {
    //       directives: {
    //         ...helmet.contentSecurityPolicy.getDefaultDirectives(),
    //         'script-src': ["'self'", "'unsafe-inline'"], // Required for onclick inline handlers
    //         'script-src-attr': ["'self'", "'unsafe-inline'"], // Required for onclick inline handlers
    //       },
    //     },
    //   }),
    // );
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 5 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    });
    this.expressApp.use(limiter);
    this.setupPassport();
  }

  /**
   * The function reqError returns an error handling middleware that
   * should be initiated after all other middlewares to catch errors
   */
  private initErrorHandler() {
    this.expressApp.use(requestError());
  }

  private setupPassport = () => {
    console.log(`Initializing Passport.`);
    passport.use(getSnykOAuth2());
    this.expressApp.use(passport.initialize());
    this.expressApp.use(passport.session());
    passport.serializeUser((user: Express.User, done) => {
      done(null, user);
    });
    passport.deserializeUser((user: Express.User, done) => {
      done(null, user);
    });

  };

}

// Create a new App instance.
// ------------------------------------------------------------------------------
new Snlack([
  new AppIndexController(),
  new SnykPreAuthController(),
  new SnykAuthController(),
  // @ts-ignore
  new SnykAuthCallbackController(this.app, this.expressApp),
], parseInt(process.env.PORT));

// Initialize our persistent JSON file store / pseudo-database.
// We should do something else in production.
export let dbPath: string;
