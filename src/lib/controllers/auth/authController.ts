// import { Controller } from '../../types';
// import { Router } from 'express';
import passport from 'passport';

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

export const AuthController = {
  path: '/auth',
  method: ['GET'],
  // @ts-ignore
  handler: (req, res) => {
    console.log('got a req: ', req);
    try {
      passport.authenticate('snyk-oauth2');
      // res.writeHead(200);
      // res.end('Auth with passport attempted to happen');
    } catch (error) {
      console.log('Error on the auth route: ', error);
    }
  }
}
