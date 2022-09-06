import type { AxiosError, AxiosRequestConfig } from 'axios';
import { SnykAuthData, Envars, SnlackUser } from '../../types';
import { DateTime } from 'luxon'; // A library for dealing with dates and times in js.
import { dbReadEntry, dbWriteEntry, getDbEntryIndex, readFromDb } from './db';
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

  // const db = await readFromDb();
  const callerSlackUid = state.slackUid;
  console.log('The caller\'s slack ID is set to: ', callerSlackUid);
  const snlackUserData: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: callerSlackUid }) as SnlackUser;

  // If there is no data, then continue with the request
  if (!snlackUserData || typeof snlackUserData === 'undefined') return request;
  console.problem('There is snlackUserData... dealing with expiry and auth dates before continuing request');

  const expiresIn = snlackUserData.snykTokenExpiry;
  const createdDate = typeof snlackUserData.snykAuthDate !== 'undefined' ? snlackUserData.snykAuthDate : new Date();
  // luxon time.
  const parsedCreateDate = DateTime.fromISO(createdDate.toString());
  const expirationDate = parsedCreateDate.plus({ seconds: expiresIn });
  // check
  if (expirationDate < DateTime.now()) {
    await refreshAndUpdateDb(snlackUserData);
  }
  return request;
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
export const refreshTokenRespInterceptor = async(error: AxiosError): Promise<AxiosError> => {
  console.enter('Entering refreshTokenRespInterceptor()...');
  const status = error.response ? error.response.status : null;

  // Only refresh and retry the token on 401 status codes, in case the access
  // token is invalidated before it expires, like when the signing key has been
  // rotated during an emergency.
  if (status === 401) {
    // Grab the current user's Slack ID from the global state object.
    const callerSlackUid = state.slackUid;

    // Read the relevant local data(current user's: auth token, refresh token
    // and expiry, etc.)
    const snlackUserData: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: callerSlackUid }) as SnlackUser;

    // If there is no local data then fail the retry
    if (!snlackUserData) {
      console.log('There is no db entry after attempting a read... Rejecting');
      return Promise.reject(error);
    }

    const newAccessToken: string = await refreshAndUpdateDb(snlackUserData)
      .catch(error => console.log('There was an issue retrieving a new access token from refreshTokenRespInterceptor()...')) as string;

    // Use the new access token to retry the failed request.
    error.config.headers['Authorization'] = `${snlackUserData.snykTokenType} ${newAccessToken}`;

    return axios.request(error.config);
  }

  console.log('--------------------------------------------------------------------------------');
  console.log('refreshTokenRespInterceptor status was not 401, returning Promise.reject with the error.');
  console.log('--------------------------------------------------------------------------------');
  return Promise.reject(error.response?.status);
}

/**
 * Refreshes the access-token for a given DB record, and updates the DB again
 * @param {AuthData} data database entry with authentication info
 * @returns string Newly refreshed access-token
 */
// async function refreshAndUpdateDb(data: SnlackUser): Promise<string> {
const refreshAndUpdateDb = async (data: SnlackUser): Promise<string> => {
  console.enter('Entering into refreshAndUpdateDb...');
  console.log('Working with this data: ', data);


  // Create a instance for encryption and decryption
  const eD = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);

  console.log('Using this refresh token to get a new access token: ', eD.decryptString(data.snykRefreshToken as string));

  // Make request to refresh our token.
  const { access_token, expires_in, refresh_token, scope, token_type } = await refreshSnykAuthToken(
    eD.decryptString(data.snykRefreshToken! as string),
    // data.snykRefreshToken! as string
  );

  console.log('The new refresh token is: ', refresh_token);

  const updatedData = {
     ...data,
    slackUid: state.slackUid,
    snykAccessToken: eD.encryptString(access_token),
    snykTokenExpiry: expires_in,
    snykRefreshToken: eD.encryptString(refresh_token),
    snykTokenType: token_type,
    snykScopes: scope,
    snykAuthDate: new Date()
  }

  console.log('UPDATED DATA........\n', updatedData);

  await dbWriteEntry({ table: 'users', data: updatedData });

  console.leave('Leaving refreshAndUpdateDb...');
  return access_token;
}
