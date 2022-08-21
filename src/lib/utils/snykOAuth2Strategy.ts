import SnykOAuth2Strategy, { ProfileFunc } from '@snyk/passport-snyk-oauth2';
import { AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';
import jwt_decode from 'jwt-decode';
import { VerifyCallback } from 'passport-oauth2';
import path from 'path';
import { v4 as uuid4 } from 'uuid';
import { SNYK_API_BASE, SNYK_APP_BASE } from '../../App';
import { SnykAPIVersion, SnykAuthData } from '../../types';
import { callSnykApi } from './callSnykApi';
import * as db from './db';
import { EncryptDecrypt } from './encryptDecrypt';
import { getSnykAppOrgs } from './getSnykAppOrgs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const snykTokenUri = '/oauth2/token';
const authorizationUrl = '/oauth2/authorize';

type Params = {
  expires_in: number;
  scope: string;
  token_type: string;
}

type JWT = {
  nonce: string;
}

// type SnykOAuth2StrategyGetter = {
//   (slackUserId: string): SnykOAuth2Strategy;
// }

export const getSnykOAuth2 = (): SnykOAuth2Strategy => {
  const snykClientId = process.env.SNYK_CLIENT_ID as string;
  const snykClientSecret = process.env.SNYK_CLIENT_SECRET as string;
  const callbackUrl = process.env.SNYK_REDIRECT_URI as string;
  const scope = process.env.SNYK_SCOPES as string;
  const nonce = uuid4();

  console.log('-------');
  console.log('getSnykOAuth2() called:');
  console.log(`
client id: ${snykClientId}
client secret: ${snykClientSecret}
callback url: ${callbackUrl}
scope: ${scope}
nonce: ${nonce}
auth url: ${SNYK_APP_BASE}${authorizationUrl}?version=2021-08-11~experimental
`);
  console.log('-------');

  const profileFunc: ProfileFunc = (accessToken: string) => {
    return callSnykApi('bearer', accessToken, SnykAPIVersion.V1).get('/user/me');
  }

  return new SnykOAuth2Strategy(
    {
      authorizationURL: `${SNYK_APP_BASE}${authorizationUrl}?version=2021-08-11~experimental`,
      tokenURL: `${SNYK_API_BASE}${snykTokenUri}`,
      clientID: snykClientId,
      clientSecret: snykClientSecret,
      callbackURL: callbackUrl,
      scope,
      scopeSeparator: ' ',
      state: true,
      passReqToCallback: true,
      nonce,
      profileFunc,
    },
    // @ts-ignore
    async function (
      req: Request,
      access_token: string,
      refresh_token: string,
      params: Params,
      profile: AxiosResponse,
      done: VerifyCallback,
    ) {
      try {
        /**
         * The data fetched from the profile function can
         * be used for analytics or profile management
         * by the Snyk App
         */
        const snykUserId = profile.data.id;
        const decoded: JWT = jwt_decode(access_token);
        if (nonce !== decoded.nonce) throw new Error('Nonce values do not match');
        const { expires_in, scope, token_type } = params;
        /**
         * This function to get the orgs itself can be passed
         * as the profile functions as the auth token for Snyk Apps
         * are managed on the Snyk org level
         */
        const { orgs } = await getSnykAppOrgs(token_type, access_token);
        const ed = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);
        await db.writeToDb({
          date: new Date(),
          snykUserId,
          orgs,
          access_token: ed.encryptString(access_token),
          expires_in,
          scope,
          token_type,
          refresh_token: ed.encryptString(refresh_token),
          nonce,
        } as SnykAuthData, null);
      } catch (error) {
        return done(error as Error, false);
      }
      return done(null, { nonce });
    },
  );

  // const verifyStrategy = async (req, access_token, refresh_token, params, profile, done) => {
  // const verifyStrategy = () => async (
  //   req: Request,
  //   access_token: string,
  //   refresh_token: string,
  //   params: Params,
  //   profile: AxiosResponse,
  //   done: VerifyCallback
  // ) => {
  //    try {
  //     /**
  //      * The data fetched from the profile function can
  //      * be used for analytics or profile management
  //      * by the Snyk App
  //      */
  //     console.log('Trying to verify...');
  //     const snykUserId = profile.data.id;
  //      console.log('This is the snykUserId', profile.data.id);
  //     const decoded: JWT = jwt_decode(access_token);
  //     if (nonce !== decoded.nonce) throw new Error('Nonce values do not match');
  //     const { expires_in, scope, token_type } = params;
  //     /**
  //      * This function to get the orgs itself can be passed
  //      * as the profile functions as the auth token for Snyk Apps
  //      * are managed on the Snyk org level
  //      */
  //     const { orgs } = await getSnykAppOrgs(token_type, access_token);
  //     const ed = new EncryptDecrypt(process.env.SnykEncryptionSecret as string);
  //     // await db.writeToDb({
  //     //   date: new Date(),
  //     //   snykUserId,
  //     //   orgs,
  //     //   access_token: ed.encryptString(access_token),
  //     //   expires_in,
  //     //   scope,
  //     //   token_type,
  //     //   refresh_token: ed.encryptString(refresh_token),
  //     //   nonce,
  //     // } as SnykAuthData, null);
  //   } catch (error) {
  //     return done(error as Error, false);
  //   }
  //   return done(null, { nonce });
  // };

  // // @ts-ignore
  // return new SnykOAuth2Strategy(strategyOptions, verifyStrategy);

}
