import { SnykAuthData, SnlackUser } from './';
import { Installation } from '@slack/bolt';


/**
 * Interface describing the intended structure of our lowdb
 */
export interface DB {
  users: SnlackUser[];
  snykAppInstalls: SnykAuthData[];
  slackAppInstalls: Installation[];
}

/**
 * Interface describing a function which operates on the Db
 */
export interface DbInteractionFunc {
  [index: string | number]: any,
  (args: {
    // [propName: string]: any,
    table: 'users' | 'snykAppInstalls' | 'slackAppInstalls',
    nestedTable?: string,
    data?: DbTableEntry,
    key?: string | number,
    value?: string | number,
    index?: number,
  }): boolean | Promise<boolean | number | void | undefined | DbTableEntry> | Promise<Installation> | number;
}

/**
 * Discriminating Union for possible entry object structures
 */
export type DbTableEntry =
  | SnlackUser
  | Installation
  | SnykAuthData;
