import {App as Slack} from '@slack/bolt';

export type SnlackEvent = {
  (slack: Slack): void;
}
