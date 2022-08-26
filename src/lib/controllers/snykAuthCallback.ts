import type { Controller } from '../../types';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import passport from 'passport';
import { HTTPException } from '../exceptions';
import { redirectError } from '../middleware';
import { Application } from 'express';
import { App as Slack } from '@slack/bolt';

/**
 * The SnykAuthCallbackController class for handling the last
 * step of Snyk Authorization flow with Snyk. That is,
 * to handle failure and success of authentication flow.
 * Every controller class implements the controller
 * interface which has two members the path and the router.
 */
export class SnykAuthCallbackController implements Controller {
  // The base URL path for this controller
  public path = '/snyk/callback';
  // Express router for this controller
  public router: Router = Router();

  /**
   * The constructor is used to initialize the
   * routes for this controller
   */

  constructor(slack: Slack, expressApp: Application) {
    console.enter('Entering SnykAuthCallbackController.constructor()...');
    this.initRoutes();
  }

  private initRoutes() {
    console.enter('Entering SnykAuthCallbackController.initRoutes()...');
    // Path to handle the result of authentication flow or the callback/redirect_uri
    // Uses redirect err middleware to handle error passed in query parameters of the redirect_uri
    this.router.get(`${this.path}`, redirectError, this.passportAuthenticate());
    // Path to handle success, same as what we pass to passport
    this.router.get(`${this.path}/success`, this.success);
    // Path to handle failure, same as what we pass to passport
    this.router.get(`${this.path}/failure`, this.failure);
  }

  private passportAuthenticate() {
    console.enter('Entering SnykAuthCallbackController.passportAuthenticate()...');
    return passport.authenticate('snyk-oauth2', {
      successRedirect: '/snyk/callback/success',
      failureRedirect: '/snyk/callback/failure',
    });
  }
  /**
   * Handle the success response of authentication
   * @returns The callback EJS template
   */
  private success(req: Request, res: Response, next: NextFunction) {
    console.enter('Entering SnykAuthCallbackController.success()...');
    return res.send(200);
    // @ts-ignore
    console.log('req session success?', req.session.slackUserId);
    console.log('SNYK AUTH SUCCESS.');
    // return res.render('callback');
  }
  /**
   * Handle the failure response of authentication
   * @returns Sends error through the next function to the
   * error handler middleware
   */
  private failure(req: Request, res: Response, next: NextFunction) {
    console.log('SNYK AUTH FAILED.');
    return next(new HTTPException(401, 'Authentication failed'));
  }
}
