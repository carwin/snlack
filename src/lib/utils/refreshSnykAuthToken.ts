import axios from 'axios';
import qs from 'qs';
import { SnykOAuth2GrantType, SnykAuthData, Envars } from '../../types';
import { SNYK_API_BASE } from '../../App';

const snykTokenUri = '/oauth2/token';

/**
 * This functions calls the Snyk API to refresh the auth token, using the existing
 * refresh token from the database. The request is same as getting the token the
 * first type but the grant type is different as you see from the query string used.
 * @param {String} refreshToken required to refresh the user auth token when it expires
 * @returns Promise that will return data or throw an error
 */
export const refreshSnykAuthToken = async (refreshToken: string): Promise<SnykAuthData> => {
  console.log('Entering refreshSnykAuthToken()...');
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
    console.log('result of refresh', result.data);

    console.log('Returning from refreshSnykAuthToken()...');
    return result.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data);
    }
    throw error;
  }
}
