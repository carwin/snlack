/// Snyk Apps Demo
import express from 'express';
import { Router } from 'express';
import { reqError } from './lib/middleware';
import * as path from 'path';
import { envCheck, Severity } from 'envar-check';
import * as fs from 'fs';
import { join } from 'path';
import type { Application } from 'express';
import type { Server } from 'http';
import type { Controller } from './lib/types';
import { Envars, Config } from './lib/types';
import config from 'config';
import passport from 'passport';
import expressSession from 'express-session';
import { getOAuth2 } from './lib/utils/snyk/OAuth2Strategy';
import { v4 as uuidv4 } from 'uuid';
import {
  SnykAuthController,
  SnykPreAuthController,
  SnykAuthCallbackController,
  IndexController
} from './lib/controllers';
// import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
////
// Slack App stuff
import { App as BoltApp, ExpressReceiver, HomeView, LogLevel, FileInstallationStore } from "@slack/bolt";
// const { FileInstallationStore } = require("@slack/oauth");
const Workspace = require("./workspace");
//
// Other / TMP
import * as dotenv from 'dotenv';
import { createHome } from './appHome';
// import { CustomRoute } from '@slack/bolt/dist/receivers/SocketModeReceiver';
// import { FileInstallationStore } from '@slack/bolt';
//

export const SNYK_API_BASE = config.get(Config.SnykApiBase);
export const SNYK_APP_BASE = config.get(Config.SnykAppBase);

/**
 * The package dotenv is used to load all your environmental
 * variables from the specified file path.
 */
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Slack Signing Secret: ', process.env.SLACK_SIGNING_SECRET);

/**
 * The App class has all app related configuration required
 * to run the app instance.
 */
class App {
  public app: Application;
  public slack: { app: BoltApp, receiver: ExpressReceiver };
  public fileStore: FileInstallationStore;
  private server: Server | Promise<any>;

  /**
   * Constructor for the App class
   * @param {Controller[]} controllers Array of controllers used by different routes
   * @param {number} port Port for the app to listen to
   * We initialize all the required configurations such as middlewares in the
   * constructor of this class
   */
  constructor(controllers: Controller[], port: number) {
    // Initialize the app(create express server)
    // Slack?
    // @ts-ignore
    this.app = express();
    this.slack = this.initSlack();
    this.fileStore = new FileInstallationStore();
    // Check the require environmental variables are set
    this.checkEnvVars();
    // Initialize the DB file(we use lightweight JSON based lowdb for this demo app)
    this.initDatabaseFile();
    this.initGlobalMiddlewares();
    this.initRoutes(controllers);
    // Error handler middleware at the last
    this.initErrorHandler();

    // Start the server
    this.server = this.newListen(3000);
  }

  private initSlack = () => {
    const slackReceiver = this.initSlackReceiver();
    const slackApp = this.initSlackApp(slackReceiver);

    // @ts-ignore
    slackApp.action('auth_snyk', ({ ack, context }) => {
      ack();
      console.log('Hey, the auth button was clicked!');
    })

    slackApp.event('app_home_opened', async ({ event, client, context }) => {
      console.log(`@${event.user} opened the Home tab`);
      try {
        // context.snykAuthorized = typeof context.snykAuthorized !== 'undefined' ? true : false;
        const homeView :HomeView = await createHome({user: event.user});
        await client.views.publish({
          user_id: event.user,
          view: homeView
        });
      } catch (error) {
        console.error(error);
        // @ts-ignore
        console.log(error.data.response_metadata.messages);
      }
    });


    return {
      app: slackApp,
      receiver: slackReceiver
    }

  }

  private initSlackReceiver = () => {
   return new ExpressReceiver({
     // signingSecret: Config.SlackSigningSecret,
     // @ts-ignore
     signingSecret: process.env.SLACK_SIGNING_SECRET,
     app: this.app,
     // signingSecret: process.env.SLACK_SIGNING_SECRET,
     clientId: process.env.SLACK_CLIENT_ID,
     clientSecret: process.env.SLACK_CLIENT_SECRET,
     stateSecret: "my-secret",
     // scopes: ["users:read", "im:write"],
     installationStore: {
       storeInstallation: async (installation: any) => {
         const ws = new Workspace(installation);
         console.log(ws.id);

         return await this.fileStore.storeInstallation(installation);
       },
       fetchInstallation: async (installation: any) => {
         return await this.fileStore.fetchInstallation(installation);
       },
       deleteInstallation: async (installation: any) => {
         return await this.fileStore.deleteInstallation(installation);
       },
     },
   });
  }

  private initSlackApp = (receiver: ExpressReceiver) => {
    console.log('init slack app saw this signing secret: ', process.env.SLACK_SIGNING_SECRET);

    const slackApp = new BoltApp({
      token: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_SOCKET_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      extendedErrorHandler: true,
      logLevel: LogLevel.DEBUG,
      socketMode: false,
      receiver: receiver,
      developerMode: false
    });

    return slackApp;

  }
  /**
   * Initialize all the routes and the controllers
   * @param {Controller[]} controllers
   * Check the controller interface for more details
   */
  private initRoutes(controllers: Controller[]) {
    // this.app.use('/slack', this.slack.receiver.router);

    controllers.forEach((controller: Controller) => {
      this.app.use('/', controller.router);
    });
  }

  /**
   *
   * @param {Number} port Start the app the listen on the port specified
   * @returns The express server that was created
   */
  private listen(port: number) {
    this.server = this.app.listen(port, () => {
      // Multi line console output
      console.log(`
            App listening on port: ${port}

            User view: http://localhost:3000
            Admin view: http://localhost:3000/admin`);
    });
    return this.server;
  }

  private newListen(port: number) {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`
App listening on port: ${port}

User view: http://localhost:3000
Admin view: http://localhost:3000/admin`);

          resolve(this.app);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * The function sets up all the required global middleware
   * for express server
   * 1. express.json(): Express middleware to handle JSON requests
   * 2. express.urlencoded(): Express middleware to handle URL encoded calls
   * 3. app.set('views'): The application uses EJS templating the function
   *    sets the paths to the ejs template view directory
   * 4. app.set('view engine', 'ejs'): Set the view engine for this app to EJS
   * 5. app.use('/public'): Sets the public directory path where all public
   *    assets will be stored
   * 6. We use express sessions which are further used by passportjs
   * 7. The helmet middleware helps us protect against many milicious issues
   *    for example by disabling X-Powered-By header which exposes information
   *    about the used framework to potential attackers.
   *    Read more: https://cwe.mitre.org/data/definitions/352.html
   * 8. Since majority of our app pages are rendered directly from file system
   *    ex: res.render('example')
   *    and does not use a rate-limiting mechanism. It may enable the attackers
   *    to perform Denial-of-service attacks. Rate limited helps us prevent that
   *    Read more: https://cwe.mitre.org/data/definitions/770.html
   */
  private initGlobalMiddlewares() {
    this.app.use('/slack/events', this.slack.receiver.router);
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.set('views', path.join(__dirname, '/views'));
    this.app.set('view engine', 'ejs');
    this.app.use('/public', express.static(path.join(__dirname, '/public')));
    this.app.use(expressSession({ secret: uuidv4(), resave: false, saveUninitialized: true }));
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
    this.app.use(limiter);
    this.setupPassport();
  }

  /**
   * The function reqError returns an error handling middleware that
   * should be initiated after all other middlewares to catch errors
   */
  private initErrorHandler() {
    this.app.use(reqError());
  }

  /**
   * Check all the required environmental variables are set or throw an error
   */
  private checkEnvVars() {
    envCheck(
      [Envars.SnykClientId, Envars.SnykClientSecret, Envars.SnykRedirectUri, Envars.SnykScopes, Envars.SnykEncryptionSecret],
      Severity.FATAL,
    );
  }

  /**
   * Initialize the database file to be used by our DB
   */
  private initDatabaseFile() {
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

  /**
   * Snyk Apps use OAuth2.0 and in this app we use passportjs
   * to plug and play Snyk Authorization. There are four steps
   * required to use passportjs with OAuth2.0 Snyk Authorization
   * flow.
   * 1. Initialize a passport strategy, like we go in the getOAuth2
   * 2. Setup passport middleware with all the settings, like we do
   *    below
   * 3. Call passport.authenticate function to initiate auth flow
   *    like we do in the authController
   * 4. Handle the success or failure of authentication like we do
   *    in callbackController
   */
  private setupPassport() {
    /**
     * State: is required for authorization via Snyk Apps. State in this
     * case is managed by passportjs library. If you check the getOAuth2
     * function which @returns OAuth2 strategy, you will see state is set
     * to true. You can read more about state in RFC:
     * https://datatracker.ietf.org/doc/html/rfc6749#section-10.12
     *
     * Nonce: is also required by Snyk Apps authorization flow. Nonce is
     * encoded in the token returned. You can read more about it in the RFC:
     * https://datatracker.ietf.org/doc/html/rfc6749#section-7.1
     *
     * Please note: Passportjs OAuth2 strategy does not support nonce at the
     * moment. So we are verifying the nonce value manually in this application
     *
     * This the getOAuth2 function which return the OAuth2 strategy, requires
     * a nonce value to be passed
     */

    passport.use(getOAuth2());
    this.app.use(passport.initialize());
    this.app.use(passport.session());
    passport.serializeUser((user: Express.User, done) => {
      done(null, user);
    });
    passport.deserializeUser((user: Express.User, done) => {
      done(null, user);
    });
  }
}


/**
 * Creates a new app instance
 * @param {Controller[]} controllers Array of controllers used by different routes
 * @param {Number} port Port for the app to listen to. The config package is used to
 * load the port based on the NODE_ENV that is set. It uses the default.json file
 * in the config directry by default
 */
new App(
  [
    // new AdminController(),
    // new CallbackController(),
    new SnykAuthCallbackController(),
    new SnykPreAuthController(),
    new SnykAuthController(),
    new IndexController(),
    // new ProjectsController(),
    // new SettingsController(),
    // new DefaultController(),
  ],
  config.get(Config.Port),
);

export let dbPath: string;
export default App;
