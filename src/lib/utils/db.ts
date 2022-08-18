import { Low, JSONFile } from 'lowdb';
import { dbPath } from '../../app';
import { AuthorizeResult, InstallationQuery, Installation } from '@slack/oauth';
// import { AuthData } from '../../../types';
// import { readFromDb } from './readFromDb';

export interface DB {
  [index: string]: SnykAuthData[] | SlackInstallData[];
  snykAppInstalls: SnykAuthData[];
  slackAppInstalls: SlackInstallData[];
}

export interface SnykOrg {
  id: string;
  name: string;
}

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

export interface SlackInstallData {
  [index: string]: string | Date | {} | null;
  date: Date;
  installation: {};
  enterpriseId: string | null; // @TODO
  teamId: string | null;
  userId: string | null;
}

/**
 * Read data from DB, you could use any database of your
 * choice, but we are using lightweight lowdb.
 * @returns Promise with DB
 */
export async function readFromDb(): Promise<DB> {
  const adapter = new JSONFile<DB>(dbPath);
  const db = new Low<DB>(adapter);
  await db.read();
  // Return existing data or create a new DB
  return db.data ?? buildNewDb();
}

/**
 * @returns DB instance of lowdb
 */
function buildNewDb(): DB {
  return { snykAppInstalls: [], slackAppInstalls: [] };
}


/**
 * Function used to write to database(JSON) file
 * in this case
 * @param {SnykAuthData} Snyk related auth data to be written to the DB
 * @param {SlackInstallData} Slack related data about the current installation
 */
export const writeToDb = async (snykAuthData?: SnykAuthData | null, slackInstallData?: SlackInstallData | null): Promise<void> => {
  const existingData = await readFromDb();
  if (snykAuthData) existingData.snykAppInstalls.push(snykAuthData);
  if (slackInstallData) existingData.slackAppInstalls.push(slackInstallData);

  // Creates a new DB if one doesn't already exists
  const adapter = new JSONFile(dbPath);
  const db = new Low(adapter);
  db.data = existingData;
  return db.write();
}

/**
 * Function used to update the installs stored in the database
 * @param {oldSnykData} oldData Old data that needs updation
 * @param {oldSlackData} oldData Old data that needs updation
 * @param {newSnykData} newData New data
 * @param {newSlackData} newData New data
 * @returns {Boolean} True is db update was success, false otherwise
 */
// const updateDb = (oldSnykData?: SnykAuthData, oldSlackData?: SlackInstallData, newSnykData?: SnykAuthData, newSlackData?: SlackInstallData) => Promise<boolean> {
const updateDb = async (recordType: 'snykAuth' | 'slackInstall', oldData: SnykAuthData | SlackInstallData, newData: SnykAuthData | SlackInstallData): Promise<boolean> => {
  const adapter = new JSONFile<DB>(dbPath);
  const db = new Low<DB>(adapter);
  await db.read();
  if (db.data == null) {
    return false;
  }

  let typeKey: string | null = recordType === 'snykAuth' ? 'snykAppInstalls' : recordType === 'slackInstall' ? 'slackAppInstalls' : null;

  // After reading check if data exists in the database
  if (typeKey !== null) {
    // @ts-ignore
    const recordSet: SnykAuthData[] | SlackInstallData[] = db.data[typeKey] || [];
    const index = recordSet.findIndex((record: SnykAuthData | SlackInstallData) => record.date === oldData.date);
    if (index === -1) return false;
    recordSet[index] = newData;
    // Replace the existing data with new data.
    // if (recordType === 'snykAuth') db.data.snykAppInstalls = recordSet;
    db.data[typeKey] = recordSet;
    await db.write();
    return true;
  }
  return false;
}

export const lookupDbRecord = async (recordType: 'snykAuth' | 'slackInstall', lookupKey: string, lookupVal: string, fullRecord: boolean): Promise<any> => {
  console.log('DB Lookup requested.');
  console.log(`Received parameters -
    recordType: ${recordType},\n
    lookupKey: ${lookupKey},\n
    lookupVal: ${lookupVal},\n
    fullRecord: ${fullRecord}`);

  const adapter = new JSONFile<DB>(dbPath);
  const db = new Low<DB>(adapter);
  await db.read();
  if (db.data == null) {
    return false;
  }

  const typeKey: string | null = recordType === 'snykAuth' ? 'snykAppInstalls' : recordType === 'slackInstall' ? 'slackAppInstalls' : null;

  if (typeKey !== null) {
    let result: any = false;
    const recordSet: SnykAuthData[] | SlackInstallData[] = db.data[typeKey] || [];
    recordSet.map((record: SnykAuthData | SlackInstallData) => {
      // First check that the record has the lookup key.
      if (lookupKey in record) {

        // If the lookupVal param was passed, we should be doing a comparison -
        // we'll return a boolean unless fullRecord is true.
        if (lookupVal && fullRecord) {
          result = record[lookupKey] === lookupVal ? record : false;
        }
        if (lookupVal && !fullRecord) {
          result = record[lookupKey] === lookupVal ? true : false;
        }
      }
    });
    return result;
  }
}

// @TODO
// This is part of some work I was doing with a custom installationStore for the InstallProvider.
// It never worked quite right.
export const slackDbQueryAsAuthorizedResult = async (installQuery: any) => {
  const adapter = new JSONFile<DB>(dbPath);
  const db = new Low<DB>(adapter);
  await db.read();
  if (db.data == null) {
    throw new Error('Database had no data, exiting.');
  }

  let data: any = false;

  const recordSet: SlackInstallData[] = db.data.slackAppInstalls;

  recordSet.map((record: SlackInstallData) => {
    if (installQuery.teamId === record.teamId || (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== false)) {
      data = {
        // @ts-ignore
        botToken: record.installation.botToken,
        // @ts-ignore
        userToken: record.installation.userToken,
        // @ts-ignore
        botId: record.installation.botId,
        // @ts-ignore
        botUserId: record.installation.botUserId,
        teamId: record.teamId,
        enterpriseId: record.enterpriseId,
      }
    }
  })

  return data;

}
