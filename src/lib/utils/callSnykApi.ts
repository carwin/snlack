import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { SnykAPIVersion } from '../../types';
import { SNYK_API_BASE } from '../../App';
import { refreshTokenReqInterceptor, refreshTokenRespInterceptor } from './axiosInterceptors';

export interface snykAPIUtilityArgs {
  tokenType: string;
  token: string;
  version: SnykAPIVersion;
  params?: {};
  data?: {};
}

/**
 * Utility function to call the Snyk API
 * @param {String} tokenType ex: bearer, token, etc
 * @param {String} token authentication token
 * @param {APIVersion} version API version to call
 * @returns {AxiosInstance}
 */
export function callSnykApi(tokenType: string, token: string, version: SnykAPIVersion, slackCallerUid?: string): AxiosInstance {
  const contentType = version === SnykAPIVersion.V1 ? 'application/json' : 'application/vnd.api+json';

  const axiosInstance = axios.create({
    baseURL: `${SNYK_API_BASE}/${version}`,
    headers: {
      'Content-Type': contentType,
      Authorization: `${tokenType} ${token}`,
    },
    // params: {
    //   slackCaller: slackCallerUid
    // }
  });

  axiosInstance.interceptors.request.use(refreshTokenReqInterceptor, Promise.reject);
  axiosInstance.interceptors.response.use((response) => response, refreshTokenRespInterceptor);

  return axiosInstance;
}

export const callSnykApi2 = ({ tokenType, token, version, params, data }: snykAPIUtilityArgs): AxiosInstance => {
  // const contentType = version === SnykAPIVersion.V1 ? 'application/json; charset=UTF-8' : 'application/vnd.api+json';
  const contentType = version === SnykAPIVersion.V1 ? 'application/json' : 'application/vnd.api+json';

  console.log('//////////////////// Calling Snyk API HERE /////////////////////')
  console.log('Creating an axios instance...')

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
