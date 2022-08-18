import { SnykOrg } from './';

export interface SnykAuthData {
  [index: string]: string | Date | SnykOrg[] | number;
  date: Date;
  snykUserId: string;
  slackUserId: string;
  orgs: SnykOrg[];
  access_token: string;
  expires_in: 3600;
  scope: string;
  token_type: string;
  nonce: string;
  refresh_token: string;
};
