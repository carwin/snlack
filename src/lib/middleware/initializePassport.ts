import passport from 'passport';
import { ExpressReceiver } from '@slack/bolt';
import { getSnykOAuth2 } from "../utils";

export const initializePassport = (receiver: ExpressReceiver) => {
  console.log(`Initializing Passport.`);
  passport.use(getSnykOAuth2());
  receiver.app.use(passport.initialize());
  receiver.app.use(passport.session());
  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });
  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

};
