import SnykOAuth2Strategy, { ProfileFunc } from '@snyk/passport-snyk-oauth2';
import { AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';
import jwt_decode from 'jwt-decode';
import { VerifyCallback } from 'passport-oauth2';
import path from 'path';
import { v4 as uuid4 } from 'uuid';
import { SNYK_API_BASE, SNYK_APP_BASE } from '../../App';
import { SnlackUser, SnykAPIVersion } from '../../types';
import { callSnykApi } from './callSnykApi';
import { getDbEntryIndex, readFromDb, dbWriteEntry } from './db';
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

export const getSnykOAuth2 = (state: any): SnykOAuth2Strategy => {
  console.enter('Entering getSnykOAuth2()...');
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


// interface SnykStrategyOptions extends StrategyOptionsWithRequest {
//     authorizationURL: string;
//     tokenURL: string;
//     clientID: string;
//     clientSecret: string;
//     callbackURL: string;
//     nonce: string;
//     scope: string | string[];
//     state: any;
//     profileFunc?: ProfileFunc;
// }

  // interface NewProfileFunc extends Omit<ProfileFunc, (accessToken)> {
    // (accessToken: string, slackCallerUid: string): Promise<any>;
  // }

  // const slackUserId: string | null = sessionStorage.getItem('slackInstallUserId');
  // var slackUserId: string = state.slackUid;
  // console.log('sesh?', slackUserId);

  const profileFunc: ProfileFunc = (accessToken: string): Promise<any> => {
    return callSnykApi('bearer', accessToken, SnykAPIVersion.V1, state.slackUserId || undefined).get('/user/me');
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
        // @ts-ignore
        const slackUserId = state.slackUid || req.params.slackUserId || req.session.slackUserId;
        const snykUserId = profile.data.id;
        console.log('params in the new strategy:', params);
        const decoded: JWT = jwt_decode(access_token);
        if (nonce !== decoded.nonce) throw new Error('Nonce values do not match');
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
          console.problem('There is no matching db entry for given slackUid.');
        };

        console.problem(`slack user id before write is: ${slackUserId}`);
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
          snykNonce: nonce,
        }
        const storageObj_OG = {
          date: new Date(),
          snykUserId,
          orgs,
          access_token: ed.encryptString(access_token),
          expires_in,
          scope,
          token_type,
          refresh_token: ed.encryptString(refresh_token),
          nonce,
        }

        // if (dbEntry && typeof dbEntry.snykUid !== 'undefined') {

        // }

        await dbWriteEntry({ table: 'users', data: storageObj as SnlackUser });

        // await db.writeToDb( storageObj_OG as SnykAuthData, null, slackUserId as string);

      } catch (error) {
        return done(error as Error, false);
      }
      console.log('returning done with null or a nonce');
      return done(null, { nonce });
    },
  );

}
