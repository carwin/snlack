// import { Controller } from '../../types';
import SnykOAuth2Strategy, { ProfileFunc } from '@snyk/passport-snyk-oauth2';
// import { Router } from 'express';
import axios from 'axios';
import passport from 'passport';
import config from 'config';
import { Envars } from '../../types';

// /**
//  * The AuthController class for handling authentication
//  * of the app via Snyk Authorization flow. This is the
//  * third step of passport setup. Every controller class
//  * implements the controller interface which has two
//  * members the path and the router.
//  */
// export class AuthController implements Controller {
//   // The base URL path for this controller
//   public path = '/auth';
//   // Express router for this controller
//   public router = Router();

//   /**
//    * The constructor is used to initialize the
//    * routes for this controller
//    */
//   constructor() {
//     this.initRoutes();
//   }

//   /**
//    * The /auth route is called to authenticate the Appp
//    * via Snyk using passportjs authenticate method
//    */
//   private initRoutes() {
//     this.router.get(`${this.path}`, passport.authenticate('snyk-oauth2'));
//   }
// }
  // const clientID = process.env[Envars.SnykClientId] as string;
  // const clientSecret = process.env[Envars.SnykClientSecret] as string;
  // const callbackURL = process.env[Envars.SnykRedirectUri] as string;
  // const scope = process.env[Envars.SnykScopes] as string;
  // const nonce = uuid4();

const AuthSnyk = async () => {

  try {
    console.log('trying passport.authenticate...');
    // await axios.get(`https://api.snyk.io/oauth2/authorize?version=2021-08-11~experimental&client_id=${clientID}&redirect_uri=${redirectURL}&response_type=code&nonce=${nonce}&state=abc`);
    passport.authenticate('snyk-oauth2');
    // res.writeHead(200);
    // res.end('Auth with passport attempted to happen');
  } catch (error) {
    console.log('Error on the auth route: ', error);
  }
}

export const AuthController = {
  path: '/auth',
  method: ['GET'],
  // @ts-ignore
  handler: (req, res) => {
    res.writeHead(200);
    console.log('got a req: ', req);
    res.end(AuthSnyk());
  }
}

export const HomeController = {
  path: '/',
  method: ['POST'],
  // @ts-ignore
  handler: (req, res) => {
    res.writeHead(200);
    console.log('Hit home');
    res.end(() => { console.log('That\'s all.') })
  }
}
