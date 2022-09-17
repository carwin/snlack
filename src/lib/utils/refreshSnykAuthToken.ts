import axios from 'axios';
import qs from 'qs';
import { SNYK_API_BASE } from '../../App';
import { SnykAuthData, SnykOAuth2GrantType } from '../../types';

// @TODO Enum?
/** The URI to hit during Snyk token refresh. */
const snykTokenUri = '/oauth2/token';

/**
 * Refresh the Snyk auth token
 *
 * @remarks
 * This functions calls the Snyk API to refresh the auth token, using the
 * existing refresh token from the database. The request is same as getting the
 * token the first type but the grant type is different as you see from the
 * query string used.
 *
 * @example
 * ```ts
 * const { access_token, expires_in, refresh_token, scope, token_type } = await refreshSnykAuthToken(
 *   myDecryptFunction(data.snykRefreshToken! as string),
 * );
 * ```
 *
 * @param refreshToken The user's current refresh token
 * @returns a Promise which returns data or throws an error
 */
export const refreshSnykAuthToken = async(refreshToken: string): Promise<SnykAuthData> => {
  const querystring = qs.stringify({
    grant_type: SnykOAuth2GrantType.RefreshToken,
    client_id: process.env.SNYK_CLIENT_ID,
    client_secret: process.env.SNYK_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  console.log('refreshing? here is the querystring: ', querystring);

  try {
    const result = await axios({
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      url: `${SNYK_API_BASE}${snykTokenUri}`,
      data: querystring,
    });
    console.log('RESULT', result);
    console.log('result of refresh', result.data);

    console.log('Returning from refreshSnykAuthToken()...');
    return result.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error);
      console.log(error.response.data);
    }
    throw error;
  }
}
