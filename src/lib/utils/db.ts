import { JSONFile, Low } from 'lowdb';
import { dbPath } from '../../App';
import { DB, SnykAuthData, SlackInstallData, SnlackUser } from '../../types';
import { Installation } from '@slack/bolt';

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
  return { users: [], snykAppInstalls: [], slackAppInstalls: [] };
}

/**
 * Function used to write to database(JSON) file
 * in this case
 * @param {SnykAuthData} Snyk related auth data to be written to the DB
 * @param {SlackInstallData} Slack related data about the current installation
 */

interface DbInteractionFunc {
  (args: {
    table: 'users' | 'snykAppInstalls' | 'slackAppInstalls',
    data?: SnykAuthData | SnykAuthData[] | Installation | Installation[] | SnlackUser | SnlackUser[],
    key?: string | number,
    value?: string | number,
  }): boolean | Promise<boolean | number | void | undefined | SnykAuthData | Installation | SnlackUser> | Promise<Installation>;
}

/**
 * Find an entry in the lowdb database given a key and a value to compare against.
 *
 * @remarks
 * Additional details
 *
 * @example
 * ```ts
 * const lookupUser = await dbReadEntry({
 *   table: 'users',
 *   key: 'snykUid',
 *   value: 'abcd0123-a1b2-cdef-3456-abcdef123456'
 * });
 * ```*/
export const dbReadEntry: DbInteractionFunc = async ({ table, key, value }): Promise<void | boolean> => {
  console.log(`Database read lookup triggered on ${table}`);
  console.log(`Looking for '${value}' on '${key}'...`);
  const adapter = new JSONFile<DB>(dbPath);
  const db = new Low<DB>(adapter);
  await db.read();

  if (db.data) {
    if (typeof key !== 'undefined' && typeof value !== 'undefined') {
      try {
        // Declare the variable we'll use to return the results of the read.
        let matchedEntry: boolean | SnykAuthData | SnlackUser | Installation = false;
        db.data[table].map((entry: SnykAuthData | Installation | SnlackUser) => {
          // Convert key to a string to be safe.
          const lookupKey = key.toString();
          // Handle nested object keys
          // @TODO: I don't understand why `boolean` isn't a valid function return type.
          lookupKey.split('.').reduce( (prev: any, curr: any): boolean | SnykAuthData | Installation | SnlackUser => {
            if (prev[curr] === value) {
              matchedEntry = entry;
            }
            return prev[curr];
          }, entry);

        });

        return matchedEntry;

      } catch (error) {
        throw new Error(`Error mapping table entries in dbReadEntry(): ${error}`);
      }
    } else {
      throw new Error('Cannot read an entry from the database without a lookup key and comparison value.');
    }
  } else {
    console.log('There is not database data, we should be building a new DB.');
    return false;
  }

}

/**
 * Handles the initial storage write operation(s) after Slack OAuth has completed.
 * Writes to `users` and `slackAppInstallations`.
 *
 * @remarks
 * This seemed like a cleaner way to go about writing two different entries. The
 * `installationStore.storeInstallation` method wants a return value so we return
 * this function.
 * We could probably combine `users` and `slackAppInstallations`, but it seems
 * wise to keep the original `Installation` Slack/Bolt creates around.
 *
 * */
export const dbWriteSlackInstallEntries = async (userEntry: SnlackUser, installEntry: Installation) => {
  const userEntryExists = await dbReadEntry({table: 'users', key: 'slackUid', value: userEntry.slackUid});
  const installEntryExists = await dbReadEntry({table: 'slackAppInstalls', key: 'userId', value: userEntry.slackUid});

  const existingData = await readFromDb();
  const adapter = new JSONFile(dbPath);
  const db = new Low(adapter);


  console.log('New Slack App install trying to write entries to DB.');
  if (!userEntryExists && !installEntryExists) {
    try {
      existingData.users.push(userEntry);
      existingData.slackAppInstalls.push(installEntry);
    } catch (error) {
      throw new Error(`Error writing Slack App installation data to data store: ${error}`);
    }
  } else {
    const existingUserEntryIndex = await getDbEntryIndex({ table: 'users', key: 'slackUid', value: userEntry.slackUid  });
    const existingInstallEntryIndex = await getDbEntryIndex({ table: 'slackAppInstalls', key: 'user.id', value: userEntry.slackUid });

    if (typeof existingUserEntryIndex === 'number') {
      console.log('Existing User in Data: ', userEntryExists);
      for (let k in userEntry) existingData.users[existingUserEntryIndex][k] = userEntry[k];
    }
    if (typeof existingInstallEntryIndex === 'number') {
      console.log('Existing Installation in Data: ', installEntryExists);
      // @ts-ignore
      for (let k in installEntry) existingData.slackAppInstalls[existingInstallEntryIndex][k] = installEntry[k];
    }

  }

  db.data = existingData;
  return db.write();

}

/**
 * Looks up an entry and returns its index in the lowdb array it exists in.
 **/
export const getDbEntryIndex: DbInteractionFunc = async({ table, key, value }): Promise<boolean | number> => {
  const existingData = await readFromDb();
  // Declare the variable we'll use to return the results of the read.
  let matchedIndex: number | boolean = false;

  if (existingData[table] && (typeof key !== 'undefined' && typeof value !== 'undefined')) {
    try {
      existingData[table].map((entry: SnykAuthData | Installation | SnlackUser, index) => {
        // Convert key to a string to be safe.
        const lookupKey = key.toString();
        // Handle nested object keys
        // @TODO: I don't understand why `boolean` isn't a valid function return type.
        lookupKey.split('.').reduce( (prev: any, curr: any): boolean | SnykAuthData | Installation | SnlackUser => {
          if (prev[curr] === value) {
            console.log(`Found the requested entry on ${table}[${index}]`);
            // @TODO: - when the hell would it be null if we're here?
            // @ts-ignore
            matchedIndex = index;
          }
          return prev[curr];
        }, entry);
      });

    } catch (error) {
      throw new Error(`Error getting DB entry index: ${error}`);
    }
  } else {
    throw new Error(`Either the provided table doesn't exist in the current DB or the provided key/value are undefined.`);
  }

  return matchedIndex;
}

/**
 * Removes an entry from a given "table" in our lowdb file.
 *
 * @remarks
 * This is more or less a clone of `dbReadEntry()`. Surely there's a way to
 * do this more elegantly.
 *
 **/
export const dbDeleteEntry: DbInteractionFunc = async ({ table, key, value }): Promise<void> => {
  console.log(`Database read lookup triggered on ${table}`);
  console.log(`Looking for '${value}' on '${key}'...`);
  const adapter = new JSONFile<DB>(dbPath);
  const db = new Low<DB>(adapter);
  await db.read();

  if (db.data && db.data[table]) {
    if (typeof key !== 'undefined' && typeof value !== 'undefined') {
      try {
        // Declare the variable we'll use to return the results of the read.
        db.data[table].map((entry: SnykAuthData | Installation | SnlackUser, index) => {
          // Convert key to a string to be safe.
          const lookupKey = key.toString();
          // Handle nested object keys
          // @TODO: I don't understand why `boolean` isn't a valid function return type.
          lookupKey.split('.').reduce( (prev: any, curr: any): boolean | SnykAuthData | Installation | SnlackUser => {
            if (prev[curr] === value) {
              console.log(`Found the requested entry: ${entry}. Deleting ${table}[${index}]`);
              // @TODO: - when the hell would it be null if we're here?
              // @ts-ignore
              db.data[table].splice(index, 1);
              db.write();
            }
            return prev[curr];
          }, entry);

        });

      } catch (error) {
        throw new Error(`Error mapping table entries in dbDeleteEntry(): ${error}`);
      }
    } else {
      throw new Error('Cannot read an entry from the database without a lookup key and comparison value.');
    }
  } else {
    console.log('There is no database data, we should be building a new DB.');
  }

}

/**
 * @deprecated
 **/
export const writeToDb = async (snykAuthData?: SnykAuthData | null, slackInstallData?: SlackInstallData | null, slackUserId?: string | undefined): Promise<void> => {
  console.log('writeToDb triggered');
  console.log('snykAuthData: ', snykAuthData);
  console.log('slackInstallData: ', slackInstallData);
  const existingData = await readFromDb();

  if (typeof slackUserId !== 'undefined') {
    // @ts-ignore
    // existingData?.users?[slackUserId].slackUid  = slackUserId;
    const newSnlackUser: SnlackUser = {
      slackUid: slackUserId,
    }

    if (snykAuthData) {
      // existingData
      // @ts-ignore
      newSnlackUser.snykUid = snykAuthData.snykUserId;
      newSnlackUser.snykOrgs = snykAuthData.orgs;
      newSnlackUser.snykAuthDate = snykAuthData.date;
      newSnlackUser.snykAccessToken = snykAuthData.access_token;
      newSnlackUser.snykRefreshToken = snykAuthData.refresh_token;
      newSnlackUser.snykNonce = snykAuthData.nonce;
      newSnlackUser.snykTokenType = snykAuthData.token_type;
      newSnlackUser.snykTokenExpiry = snykAuthData.expires_in;

      // @ts-ignore
      // existingData.users[slackUserId] = newSnlackUser;
      if (slackUserId) existingData.users.push(newSnlackUser);
    }

  }


  if (snykAuthData) existingData.snykAppInstalls.push(snykAuthData);
  // @ts-ignore
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
 *
 * @deprecated
 **/
// const updateDb = (oldSnykData?: SnykAuthData, oldSlackData?: SlackInstallData, newSnykData?: SnykAuthData, newSlackData?: SlackInstallData) => Promise<boolean> {
// export const updateDb = async (recordType: 'snykAuth' | 'slackInstall', oldData: SnykAuthData | SlackInstallData, newData: SnykAuthData | SlackInstallData): Promise<boolean> => {
//   const adapter = new JSONFile<DB>(dbPath);
//   const db = new Low<DB>(adapter);
//   await db.read();
//   if (db.data == null) {
//     return false;
//   }

//   let typeKey: string | null = recordType === 'snykAuth' ? 'snykAppInstalls' : recordType === 'slackInstall' ? 'slackAppInstalls' : null;

//   // After reading check if data exists in the database
//   if (typeKey !== null) {
//     // @ts-ignore
//     const recordSet: SnykAuthData[] | SlackInstallData[] = db.data[typeKey] || [];
//     const index = recordSet.findIndex((record: SnykAuthData | SlackInstallData) => record.date === oldData.date);
//     if (index === -1) return false;
//     recordSet[index] = newData;
//     // Replace the existing data with new data.
//     // if (recordType === 'snykAuth') db.data.snykAppInstalls = recordSet;
//     db.data[typeKey] = recordSet;
//     await db.write();
//     return true;
//   }

//   // @stub for snlack user entry
//   if (typeKey === null) {
//     console.log('null type key');
//   }

//   return false;
// }

// export const lookupDbRecord = async (recordType: 'snykAuth' | 'slackInstall', lookupKey: string, lookupVal: string, fullRecord: boolean): Promise<any> => {
//   console.log('DB Lookup requested.');
//   console.log(`Received parameters -
//     recordType: ${recordType},\n
//     lookupKey: ${lookupKey},\n
//     lookupVal: ${lookupVal},\n
//     fullRecord: ${fullRecord}`);

//   const adapter = new JSONFile<DB>(dbPath);
//   const db = new Low<DB>(adapter);
//   await db.read();
//   if (db.data == null) {
//     return false;
//   }

//   const typeKey: string | null = recordType === 'snykAuth' ? 'snykAppInstalls' : recordType === 'slackInstall' ? 'slackAppInstalls' : null;

//   if (typeKey !== null) {
//     let result: any = false;
//     const recordSet: SnykAuthData[] | SlackInstallData[] = db.data[typeKey] || [];
//     recordSet.map((record: SnykAuthData | SlackInstallData) => {
//       // First check that the record has the lookup key.
//       if (lookupKey in record) {

//         // If the lookupVal param was passed, we should be doing a comparison -
//         // we'll return a boolean unless fullRecord is true.
//         if (lookupVal && fullRecord) {
//           result = record[lookupKey] === lookupVal ? record : false;
//         }
//         if (lookupVal && !fullRecord) {
//           result = record[lookupKey] === lookupVal ? true : false;
//         }
//       }
//     });
//     return result;
//   }
// }



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


