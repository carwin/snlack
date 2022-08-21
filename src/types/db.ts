import { SlackInstallData, SnykAuthData } from './';

export interface DB {
  [index: string]: SnykAuthData[] | SlackInstallData[];
  snykAppInstalls: SnykAuthData[];
  slackAppInstalls: SlackInstallData[];
}
