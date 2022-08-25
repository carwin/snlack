import type { AxiosError, AxiosRequestConfig } from 'axios';
import { SnykAuthData, Envars } from '../../types';
import { DateTime } from 'luxon'; // A library for dealing with dates and times in js.
import { readFromDb } from './db';
// import { mostRecent } from '../../../controllers/projects/projectsHandlers';
import { EncryptDecrypt } from './encryptDecrypt';
import { refreshSnykAuthToken } from './refreshSnykAuthToken';
// import { refreshAuthToken } from '../apiRequests';
import axios from 'axios';

/**
 * An axios interceptor that will refresh the auth token
 * using the refresh token when the auth token expires
 * @param {AxiosRequestConfig} request that can be used in the interceptor
 * for conditional checks
 * @returns Axios request interceptor
 */
export async function refreshTokenReqInterceptor(request: AxiosRequestConfig): Promise<AxiosRequestConfig> {
  // Read the latest data(auth token, refresh token and expiry)
  const db = await readFromDb();
  // @ts-ignore
  // @TODO
  const data = mostRecentSnykInstall(db.snykAppInstalls);
  // @ts-ignore
  console.log('Does the interceptor have the session?:', request.session);
  // If no data then continue with the request
  if (!data) return request;
  // Data used to calculate the expiry
  const expiresIn = data.expires_in;
  const createdDate = data.date;
  // Used npm library luxon to parse the date and calculate expiry
  const parsedCreateDate = DateTime.fromISO(createdDate.toString());
  const expirationDate = parsedCreateDate.plus({ seconds: expiresIn });
  // Check if expired
  if (expirationDate < DateTime.now()) {
    await refreshAndUpdateDb(data);
  }
  return request;
}

export async function refreshTokenRespInterceptor(error: AxiosError): Promise<AxiosError> {
  const status = error.response ? error.response.status : null;

  // Only refresh & retry the token on 401 Unauthorized, in case the access-token is
  //  invalidated before it expires, such as the signing key being rotated in an emergency.
  if (status === 401) {
    // Read the latest data(auth token, refresh token and expiry)
    const db = await readFromDb();
    // @ts-ignore
    // @TODO
    const data = mostRecentSnykInstall(db.snykAppInstalls);
    // If no data then fail the retry
    if (!data) return Promise.reject(error);

    const newAccessToken = await refreshAndUpdateDb(data);

    // Use the new access token to retry the failed request
    error.config.headers['Authorization'] = `${data.token_type} ${newAccessToken}`;
    return axios.request(error.config);
  }

  return Promise.reject(error);
}

/**
 * Refreshes the access-token for a given DB record, and updates the DB again
 * @param {AuthData} data database entry with authentication info
 * @returns string Newly refreshed access-token
 */
async function refreshAndUpdateDb(data: SnykAuthData): Promise<string> {
  console.log('Time to refresh and update the db...');
    // Create a instance for encryption and decryption
  const eD = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);
  // Make request to refresh token
  const { access_token, expires_in, refresh_token, scope, token_type } = await refreshSnykAuthToken(
    eD.decryptString(data.refresh_token),
  );
  // Update the access and refresh token with the newly fetched access and refresh token
  // along with the expiry and other required info
  // @TODO
  // @ts-ignore
  await updateDb('snykAuth', data, {
    ...data,
    access_token: eD.encryptString(access_token),
    expires_in,
    refresh_token: eD.encryptString(refresh_token),
    token_type,
    scope,
    date: new Date(),
  });

  return access_token;
}
