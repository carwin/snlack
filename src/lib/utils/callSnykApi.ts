import axios, { AxiosInstance } from 'axios';
import { SnykAPIVersion } from '../../types';
import { SNYK_API_BASE } from '../../app';
import { refreshTokenReqInterceptor, refreshTokenRespInterceptor } from './axiosInterceptors';

/**
 * Utility function to call the Snyk API
 * @param {String} tokenType ex: bearer, token, etc
 * @param {String} token authentication token
 * @param {APIVersion} version API version to call
 * @returns {AxiosInstance}
 */
export function callSnykApi(tokenType: string, token: string, version: SnykAPIVersion): AxiosInstance {
  const contentType = version === SnykAPIVersion.V1 ? 'application/json' : 'application/vnd.api+json';

  console.log(`called Snyk API ${version} with ${tokenType} token: ${token}.`)

  const axiosInstance = axios.create({
    baseURL: `${SNYK_API_BASE}/${version}`,
    headers: {
      'Content-Type': contentType,
      Authorization: `${tokenType} ${token}`,
    },
  });

  axiosInstance.interceptors.request.use(refreshTokenReqInterceptor, Promise.reject);
  axiosInstance.interceptors.response.use((response) => response, refreshTokenRespInterceptor);

  return axiosInstance;
}
