import type { AxiosError, AxiosRequestConfig } from 'axios';
import { SnykAuthData, Envars, SnlackUser } from '../../types';
import { DateTime } from 'luxon'; // A library for dealing with dates and times in js.
import { dbWriteEntry, getDbEntryIndex, readFromDb } from './db';
// import { mostRecent } from '../../../controllers/projects/projectsHandlers';
import { EncryptDecrypt } from './encryptDecrypt';
import { refreshSnykAuthToken } from './refreshSnykAuthToken';
// import { refreshAuthToken } from '../apiRequests';
import axios from 'axios';
import { state } from '../../App';

/**
 * Axios interceptor that will refresh the auth token using the refresh token
 * when the auth token expires
 *
 * @param {AxiosRequestConfig} request that can be used in the interceptor
 * for conditional checks
 * @returns Axios request interceptor
 */
export async function refreshTokenReqInterceptor(request: AxiosRequestConfig): Promise<AxiosRequestConfig> {
  console.enter('Entering refreshTokenReqInterceptor()...');
  console.log('Interceptor params: ', request.params);
  console.log('Interceptor app state:', state);

  const db = await readFromDb();
  // @ts-ignore
  // @TODO
  // const data = mostRecentSnykInstall(db.snykAppInstalls);
  // const data = db.snykAppInstalls[0];
  const callerSlackUid = request.params.slackCaller || state.slackUid;
  console.log('The caller\'s slack ID is set to: ', callerSlackUid);

  try {
    // Look up a Db entry for the caller's Slack user ID.
    // Attempt to read the db data(auth token, refresh token and expiry)
    const dbEntryIndex = await getDbEntryIndex({ table: 'users', key: 'slackUid', value: callerSlackUid }) as number;
    const dbEntry = typeof dbEntryIndex !== 'boolean' ? db.users[dbEntryIndex] : false;

    // If there is no data, then continue with the request
    if (!dbEntry || typeof dbEntry.snykUid === 'undefined') return request;
    // Data used to calculate the expiry
    const expiresIn = dbEntry.snykTokenExpiry;
    const createdDate = dbEntry.snykAuthDate!; // There's no way snykAuthDate could be undefined if we've made it this far.
    // Use npm library luxon to parse the date and calculate expiry
    const parsedCreateDate = DateTime.fromISO(createdDate.toString());
    const expirationDate = parsedCreateDate.plus({ seconds: expiresIn });
    // Check if the Snyk access token is expired.
    // If it is, refresh the Snyk token.
    if (expirationDate < DateTime.now()) {
      await refreshAndUpdateDb(dbEntry);
    }

    return request;

  } catch (error) {
    console.problem(`Had a problem in this interceptor: ${error}`);
    throw error;
  } finally {
    console.leave('Returning from refreshTokenReqInterceptor()...');
  }
}

/**
 * Axios interceptor for the refresh response
 *
 * @remarks
 * Only refresh & retry the token on 401 Unauthorized, in case the
 * access-token is invalidated before it expires, such as the signing key
 * being rotated in an emergency.
 *
 */
export async function refreshTokenRespInterceptor(error: AxiosError): Promise<AxiosError> {
  console.enter('Entering refreshTokenRespInterceptor()...');

  try {
    const status = error.response ? error.response.status : null;
    console.log('refreshTokenRespInterceptor() status: ', status);

    if (status === 401) {
      console.log('Error Slack Caller', error);
      const callerSlackUid = error.config.params.slackCaller || state.slackUid;
      console.log('Error Slack Caller', callerSlackUid);

      // Read the latest data(auth token, refresh token and expiry)
      const db = await readFromDb();

      const dbEntryIndex = await getDbEntryIndex({ table: 'users', key: 'slackUid', value: callerSlackUid }) as number;
      const dbEntry: SnlackUser = db.users[dbEntryIndex];

      console.log('Db Entry Index in respInterceptor', dbEntryIndex);
      console.log('Db Entry in respInterceptor', dbEntry);

      // If there is no Db, data then fail the retry
      if (!dbEntryIndex) return Promise.reject(error);

      const newAccessToken: string = await refreshAndUpdateDb(dbEntry as SnlackUser);

      // Use the new access token to retry the failed request
      if (dbEntry.snykTokenType) error.config.headers['Authorization'] = `${dbEntry.snykTokenType} ${newAccessToken}`;

      return axios.request(error.config);
    }

    return Promise.reject(error);
  } catch (error) {
    console.error('Had a problem in the refreshTokenRespInterceptor()', error);
    throw error;
  } finally {
    console.leave('Returning from refreshTokenRespInterceptor()...');
  }
}

/**
 * Refreshes the access-token for a given DB record, and updates the DB again
 * @param {AuthData} data database entry with authentication info
 * @returns string Newly refreshed access-token
 */
async function refreshAndUpdateDb(data: SnlackUser): Promise<string> {
  console.enter('Entering into refreshAndUpdateDb...');
  console.log('Time to refresh and update the db...');
  console.log('Working with this data: ', data);
  // Create a instance for encryption and decryption
  const eD = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);
  // Make request to refresh token
  const { access_token, expires_in, refresh_token, scope, token_type } = await refreshSnykAuthToken(
    // const { snykAuthToken, snykTokenExpiry, snykRefreshToken, snykScopes, snykTokenType } = await refreshSnykAuthToken(
    eD.decryptString(data.snykRefreshToken! as string),
  );
  // Update the access and refresh token with the newly fetched access and refresh token
  // along with the expiry and other required info
  // @TODO
  // @ts-ignore
  // await updateDb('snykAuth', data, {
  //   ...data,
  //   access_token: eD.encryptString(access_token),
  //   expires_in,
  //   refresh_token: eD.encryptString(refresh_token),
  //   token_type,
  //   scope,
  //   date: new Date(),
  // });

  await dbWriteEntry({ table: 'users', data: {
    ...data,
    slackUid: state.slackUid,
    snykAccessToken: eD.encryptString(access_token),
    snykTokenExpiry: expires_in,
    snykRefreshToken: eD.encryptString(refresh_token),
    snykTokenType: token_type,
    snykScopes: scope,
    snykAuthDate: new Date()
  }});

  console.log('Finished the refresh, here is the access token: ', access_token);

  console.enter('Leaving refreshAndUpdateDb...');
  return access_token;
}
