import { SnykOrg, SnykProject, SnykAuthData }  from './';

/**
 * Interface describing a user of this Slack App
 *
 * This interface contains elements from both the Slack App and the Snyk App.
 **/
export interface SnlackUser {
  [propName: string]: any;
  slackUid?: string;
  slackName?: string;
  slackTeamId?: string;
  slackTeamName?: string;
  slackInstallationDate?: Date;
  slackEnterpriseId?: string;
  slackEnterpriseUrl?: string;
  snykUid?: string;
  snykAuthDate?: Date;
  snykOrgs?: SnykOrg[];
  snykProjects?: SnykProject[];
  snykAccessToken?: string;
  snykTokenExpiry?: number;
  snykScopes?: string;
  snykTokenType?: string;
  snykRefreshToken?: string;
  snykNonce?: string;
}
