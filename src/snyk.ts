// import { ExpressReceiver } from '@slack/bolt';
// import { passport } from 'passport';

// const setupPassport = (app: ) => {
//   /**
//    * State: is required for authorization via Snyk Apps. State in this
//    * case is managed by passportjs library. If you check the getOAuth2
//    * function which @returns OAuth2 strategy, you will see state is set
//    * to true. You can read more about state in RFC:
//    * https://datatracker.ietf.org/doc/html/rfc6749#section-10.12
//    *
//    * Nonce: is also required by Snyk Apps authorization flow. Nonce is
//    * encoded in the token returned. You can read more about it in the RFC:
//    * https://datatracker.ietf.org/doc/html/rfc6749#section-7.1
//    *
//    * Please note: Passportjs OAuth2 strategy does not support nonce at the
//    * moment. So we are verifying the nonce value manually in this application
//    *
//    * This the getOAuth2 function which return the OAuth2 strategy, requires
//    * a nonce value to be passed
//    */

//   passport.use(getOAuth2('abc'));
//   this.app.use(passport.initialize());
//   this.app.use(passport.session());
//   passport.serializeUser((user: Express.User, done) => {
//     done(null, user);
//   });
//   passport.deserializeUser((user: Express.User, done) => {
//     done(null, user);
//   });
// }
