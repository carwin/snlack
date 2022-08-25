import { SlackInstallData, SnykAuthData, SnlackUser } from './';
import { Installation } from '@slack/bolt';


export interface DB {
  [index: string]: SnykAuthData[] | SlackInstallData[];
  users: SnlackUser[];
  snykAppInstalls: SnykAuthData[];
  slackAppInstalls: Installation[];
  // [key: string]: SnlackUser[] | SnykAuthData[] | SlackInstallData[];
  // users: SnlackUser[];
  // slackAppInstalls: SlackInstallData[];
}
