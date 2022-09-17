import { Controller } from '../../types';
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { state } from '../../App';


/**
 * A Controller implementation for the `/auth` route.
 *
 * @remarks
 *
 * ## Why a /preauth route?
 *
 * At the time of this writing Snyk blocks any requests originating from ngrok
 * URLs, which is problematic for development, since, ultimately we'd like our
 * Authorize Me button in the Slack UI to point to this app - but are using ngrok
 * and similar tools for developing it.
 *
 * The SnykPreAuthController class ensures that there's a route step within this
 * application before going out to Snyk. If the Snyk Apps authorization comes
 * from a redirect initiated by a Slack App interaction, Snyk Apps fails to
 * authorize.
 *
 * A better overview of the issue:
 * ```
 *   Slack -> abcd.ngrok.io/snyk/auth -> app.snyk.io/oauth2/authorize = FAILURE
 *   Slack -> localhost:<PORT>/snyk/auth -> app.snyk.io/oauth2/authorize = FAILURE
 *   Slack -> localhost:<PORT>/snyk/preauth -> localhost:<PORT>/snyk/auth -> app.snyk.io/oauth2/authorize = SUCCESS
 * ```
 * ## About slackUid...
 *
 * Somehow the Axios interceptors need to access the Slack user ID of the
 * initiating user. The trouble is that these routes are not handled
 * by the Bolt application, so `context` can't be accessed.
 *
 * Query parameters would work, e.g.: The user clicks the auth to Snyk
 * button, which redirects them here to /preauth (ExpressApp) and
 * simultaneously sends an 'action' event (Bolt).  If the button's link has
 * query parameters, we can access them here using `req.query` then pass
 * along data from there.
 *
 * Alternatively, and this is the chosen path for now, the Bolt action event
 * handler for the button click sets the `slackUid` key of the toy `state`
 * object.  Because `state` is global, methods/functions handled by both the
 * ExpressApp and Bolt app have access.
 *
 **/
export class SnykPreAuthController implements Controller {
  public path = '/snyk/preauth';
  public router = Router();
  /** @inheritdoc */
  constructor() {
    this.initRoutes();
  }

  /** @inheritdoc */
  private initRoutes() {
    this.router.get(`${this.path}`, this.preAuthHandler);
  }

  private preAuthHandler(req: Request, res: Response, next: NextFunction) {
    res.redirect(`/snyk/auth`);
    next();
  }

}
