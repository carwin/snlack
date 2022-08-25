import { SnykOrg, SnykAuthData }  from './';

/**
 * Interface describing a user of this Slack App
 *
 * This interface contains elements from both the Slack App and the Snyk App.
 **/
export interface SnlackUser {
  [slackUid: string | number]: string | string[] | undefined | Date | number | SnykOrg[];
  slackUid: string;
  slackName?: string;
  slackTeamId?: string;
  slackTeamName?: string;
  slackInstallationDate?: Date;
  slackEnterpriseId?: string;
  slackEnterpriseUrl?: string;
  snykUid?: string;
  snykAuthDate?: Date;
  snykOrgs?: SnykOrg[];
  snykAccessToken?: string;
  snykTokenExpiry?: number;
  snykScopes?: string;
  snykTokenType?: string;
  snykRefreshToken?: string;
  snykNonce?: string;
}
