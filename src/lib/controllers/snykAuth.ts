import { Controller } from '../../types';
import { Router } from 'express';
import passport from 'passport';

// The AuthController class for handling authentication
// of the app via Snyk Authorization flow. This is the
// third step of passport setup. Every controller class
// implements the controller interface which has two
// members the path and the router.
export class SnykAuthController implements Controller {
    // The base URL path for this controller
  public path = '/snyk/auth';
  // Express router for this controller
  public router = Router();

  // Constructor
  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get(`${this.path}`, passport.authenticate('snyk-oauth2'));
  }
}
