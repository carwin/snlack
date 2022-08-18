import { JSONFile, Low } from 'lowdb';
import { dbPath } from '../../app';
import { DB, SnykAuthData, SlackInstallData } from '../../types';

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
  console.log('writeToDb triggered');
  console.log('snykAuthData: ', snykAuthData);
  console.log('slackInstallData: ', slackInstallData);
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
export const updateDb = async (recordType: 'snykAuth' | 'slackInstall', oldData: SnykAuthData | SlackInstallData, newData: SnykAuthData | SlackInstallData): Promise<boolean> => {
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

// Usage ideas:
//
// - getDbRecordByKey({type: 'slack', teamId, 'abcd1234'});
// - getDbRecordByKey('slack', 'teamId', 'abcd1234');
// - getSlackRecordByTeam('abcd1234');
// - getSlackRecordByEnterprise('hjkl4321');

interface SnlackRecordQueryArgs {
  recordType: 'snyk' | 'slack';
  queryKey: string;
  queryVal: string | number;
}

interface SnlackRecordQuery {
  ({}: SnlackRecordQueryArgs): Promise<any> | null;
}

export const getDbRecordByKey: SnlackRecordQuery = async ({recordType, queryKey, queryVal}): Promise<any> => {
  console.log(`Attempting to retrieve DB record by key: ${queryKey} and value: ${queryVal}`);
  let recordSet: SnykAuthData[] | SlackInstallData[];

  const adapter = new JSONFile<DB>(dbPath);
  const db = new Low<DB>(adapter);
  await db.read();
  if (db.data == null) {
    console.log('DB data was null.');
    return false;
  }

  switch (recordType) {
    case 'snyk':
      console.log(`Getting a Snyk record from the DB by looking for ${queryKey}: ${queryVal}`);
      recordSet = db.data.snykAppInstalls;
      break;
    case 'slack':
      console.log(`Getting a Slack record from the DB by looking for ${queryKey}: ${queryVal}`);
      recordSet = db.data.slackAppInstalls;
      break;
    default:
      recordSet = db.data.slackAppInstalls;
  }

  let result: any = null;

  console.log('Looping records...');
  recordSet.map((record) => {
    // const searchDepth: {} = recordType === 'slack' ? record.installation : record;
   if (queryKey in record) {
      result = record[queryKey] === queryVal ? 'installation' in record ? record.installation : record : null;
    }

  });

  if (result === null) {
    console.log(`There were no records found in our data for ${queryKey} of ${queryVal}`)
  }

  return result;

};

// @TODO
// This is part of some work I was doing with a custom installationStore for the InstallProvider.
// It never worked quite right.
// export const slackDbQueryAsAuthorizedResult = async (installQuery: any) => {
//   const adapter = new JSONFile<DB>(dbPath);
//   const db = new Low<DB>(adapter);
//   await db.read();
//   if (db.data == null) {
//     throw new Error('Database had no data, exiting.');
//   }

//   let data: any = false;

//   const recordSet: SlackInstallData[] = db.data.slackAppInstalls;

//   recordSet.map((record: SlackInstallData) => {
//     if (installQuery.teamId === record.teamId || (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== false)) {
//       data = {
//         // @ts-ignore
//         botToken: record.installation.botToken,
//         // @ts-ignore
//         userToken: record.installation.userToken,
//         // @ts-ignore
//         botId: record.installation.botId,
//         // @ts-ignore
//         botUserId: record.installation.botUserId,
//         teamId: record.teamId,
//         enterpriseId: record.enterpriseId,
//       }
//     }
//   })

//   return data;

// }
