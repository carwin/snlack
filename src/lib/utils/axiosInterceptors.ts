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
  const callerSlackUid = state.slackUid;
  const snlackUserData: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: callerSlackUid }) as SnlackUser;

  // If there is no data, then continue with the request
  if (!snlackUserData || typeof snlackUserData === 'undefined') return request;

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
      .catch(error => console.log('There was an issue retrieving a new access token from refreshTokenRespInterceptor()...', error)) as string;

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
 * Refreshes the access-token for a given DB record, and updates the DB again.
 *
 * @param {AuthData} data database entry with authentication info
 * @returns string Newly refreshed access-token
 */
const refreshAndUpdateDb = async (data: SnlackUser): Promise<string> => {

  // Create a instance for encryption and decryption
  const eD = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);

  // Make request to refresh our token.
  const { access_token, expires_in, refresh_token, scope, token_type } = await refreshSnykAuthToken(
    eD.decryptString(data.snykRefreshToken! as string),
  );

  // @TODO - Is this behaving like I think it is?
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

  await dbWriteEntry({ table: 'users', data: updatedData });

  return access_token;
}
