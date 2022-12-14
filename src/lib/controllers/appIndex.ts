import { Controller } from '../../types';
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

// At the time of this writing Snyk blocks any requests originating from ngrok
// URLs, which is problematic for development, since, ultimately we'd like our
// Authorize Me button in the Slack UI to point to this app - but are using ngrok
// and similar tools for developing it.
//
// The SnykPreAuthController class ensures that there's a route step within this
// application before going out to Snyk. If the Snyk Apps authorization comes
// from a redirect initiated by a Slack App interaction, Snyk Apps fails to
// authorize.
//
// A better overview of the issue:
//
//   Slack -> abcd.ngrok.io/snyk/auth -> app.snyk.io/oauth2/authorize = FAILURE
//   Slack -> localhost:<PORT>/snyk/auth -> app.snyk.io/oauth2/authorize = FAILURE
//   Slack -> localhost:<PORT>/snyk/preauth -> localhost:<PORT>/snyk/auth -> app.snyk.io/oauth2/authorize = SUCCESS
//
export class AppIndexController implements Controller {
  public path = '/';
  public router = Router();
  constructor() {
    this.initRoutes();
  }

  // private initRoutes(req: Request, res: Response, next: NextFunction) {
  private initRoutes() {
    this.router.get(`${this.path}`, this.routeHandler);
  }

  private routeHandler(req: Request, res: Response, next: NextFunction) {
    res.sendStatus(200);
    // res.send('Good job, you made it to `/`.');
  }
}
