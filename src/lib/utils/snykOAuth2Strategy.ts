import SnykOAuth2Strategy, { ProfileFunc } from '@snyk/passport-snyk-oauth2';
import { AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';
import jwt_decode from 'jwt-decode';
import { VerifyCallback } from 'passport-oauth2';
import path from 'path';
import { v4 as uuid4 } from 'uuid';
import { SNYK_API_BASE, SNYK_APP_BASE } from '../../App';
import { SnlackUser, SnykAPIVersion } from '../../types';
import { callSnykApi, dbWriteEntry, EncryptDecrypt, getDbEntryIndex, getSnykAppOrgs, readFromDb } from './';
import * as App from '../../App';

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

/**
 * Instantiates a new SnykOAuth2Strategy
 *
 * @remarks
 * `SnyKOAuth2Strategy` is a class that comes from the
 * @snyk/passport-snyk-oauth2 package. For more info on this, check out
 * passport-js' documentation on 'Strategies'.
 *
 * {@link App} calls this during its instantiation.
 */
export const getSnykOAuth2 = (state: any): SnykOAuth2Strategy => {
  const snykClientId = process.env.SNYK_CLIENT_ID as string;
  const snykClientSecret = process.env.SNYK_CLIENT_SECRET as string;
  const snykCallbackUrl = process.env.SNYK_REDIRECT_URI as string;
  const snykScopes = process.env.SNYK_SCOPES as string;
  const snykNonce = uuid4();

  const snykProfileFunc: ProfileFunc = (accessToken: string): Promise<any> => {
    return callSnykApi('bearer', accessToken, SnykAPIVersion.V1).get('/user/me');
  }

  return new SnykOAuth2Strategy(
    {
      authorizationURL: `${SNYK_APP_BASE}${authorizationUrl}?version=2021-08-11~experimental`,
      tokenURL: `${SNYK_API_BASE}${snykTokenUri}`,
      clientID: snykClientId,
      clientSecret: snykClientSecret,
      callbackURL: snykCallbackUrl,
      scope: snykScopes,
      scopeSeparator: ' ',
      state: true,
      passReqToCallback: true,
      nonce: snykNonce,
      profileFunc: snykProfileFunc,
    },
    // @TODO: I don't understand what this TypeScript error is.
    // @ts-ignore
    async(
      req: Request,
      access_token: string,
      refresh_token: string,
      params: Params,
      profile: AxiosResponse,
      done: VerifyCallback,
    ) => {
      try {
        /**
         * The data fetched from the profile function can
         * be used for analytics or profile management
         * by the Snyk App
         */
        const slackUserId = state.slackUid;
        const snykUserId = profile.data.id;

        const decoded: JWT = jwt_decode(access_token);
        if (snykNonce !== decoded.nonce) throw new Error('Nonce values do not match');
        const { expires_in, scope, token_type } = params;

        /**
         * This function to get the orgs itself can be passed
         * as the profile functions as the auth token for Snyk Apps
         * are managed on the Snyk org level
         */
        const db = await readFromDb();

        const dbEntryIndex = await getDbEntryIndex({ table: 'users', key: 'slackUid', value: slackUserId }) as number;
        const dbEntry = typeof dbEntryIndex !== 'boolean' ? db.users[dbEntryIndex] : false;
        if (!dbEntry || typeof dbEntry.snykUid === 'undefined'){
          console.error('There is no matching db entry for given slackUid.');
        };

        // @ts-ignore
        const { orgs } = await getSnykAppOrgs(slackUserId, token_type, access_token);
        const ed = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);
        const storageObj = {
          slackUid: slackUserId,
          snykAuthDate: new Date(),
          snykUid: snykUserId,
          snykOrgs: orgs,
          snykAccessToken: ed.encryptString(access_token),
          snykTokenExpiry: expires_in,
          snykScopes: scope,
          snykTokenType: token_type,
          snykRefreshToken: ed.encryptString(refresh_token),
          snykNonce,
        }

        await dbWriteEntry({ table: 'users', data: storageObj as SnlackUser });

      } catch (error) {
        return done(error as Error, false);
      }
      console.log('returning done with null or a nonce');
      return done(null, { snykNonce });
    },
  );

}
