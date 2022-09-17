import { JSONFile, Low } from 'lowdb';
import { dbPath, state } from '../../App';
import { DB, DbTableEntry, DbInteractionFunc, SnykAuthData, SlackInstallData, SnlackUser, SnykOrg, SnykProject } from '../../types';
import { Installation } from '@slack/bolt';
import { validate as validateUUID, v4 as uuidV4 } from 'uuid';

// @TODO: There's quite a bit of cleaning up to do - I've been hacking my way through random ideas.

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
  const dbData = await readFromDb();

  // @ts-ignore
  if (dbData && dbData[table]) {
    if (typeof key !== 'undefined' && typeof value !== 'undefined') {
      try {
        // Declare the variable we'll use to return the results of the read.
        let matchedEntry: boolean | SnykAuthData | SnlackUser | Installation = false;
        dbData[table].map((entry: SnykAuthData | Installation | SnlackUser) => {
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
    console.log('There is no database data, we should be building a new DB.');
    return false;
  }

}

export const dbReadNestedEntry: DbInteractionFunc = async ({ table, nestedTable, key, value }) => {
  console.log(`Database read lookup triggered on ${nestedTable} in ${table} entries`);
  console.log(`Looking for '${value}' on '${key}'...`);

  console.log(`table: ${table}`);
  console.log(`nestedTable: ${nestedTable}`);
  console.log(`key: ${key}`);
  console.log(`value: ${value}`);

  // const adapter = new JSONFile<DB>(dbPath);
  // const db = new Low<DB>(adapter);
  // await db.read();
  const dbData = await readFromDb();

  if (dbData
    && typeof nestedTable !== 'undefined'
    && typeof key !== 'undefined'
    && typeof value !== 'undefined')
  {
    console.log('Okay those things are not undefined');
    try {
      // Declare the variable we'll use to return the results of the read.
      let matchedEntry: boolean | DbTableEntry = false;
      const lookupNestedTable = nestedTable.toString();
      const lookupKey = key.toString();
      console.log('About to map...');

      dbData[table].map((entry: DbTableEntry, index: any) => {
        lookupNestedTable.split('.').reduce( (prev: any, curr: any): any => {
          if (Array.isArray(prev[curr])) {
            prev[curr].map((nest: any) => {
              lookupKey.split('.').reduce( (kprev: any, kcurr: any): any => {
                // @TODO: Break out of parent loop early.
                if (kprev[kcurr] === value) matchedEntry = entry;
                return kprev[kcurr];
              }, nest);
            })
          } else {
            lookupKey.split('.').reduce( (kprev: any, kcurr: any): any => {
              console.log('Further Reduced into: ', kprev[kcurr]);
              if (kprev[kcurr] === value) matchedEntry = entry;
              return kprev[kcurr];
            }, prev[curr]);
          }

          return prev[curr];
        }, entry);

      });

      return matchedEntry;

    } catch (error) {
      console.error('Error mapping table entries in dbReadEntry():', error);
      throw 'ERORororROroRO'
      // throw error;
    }
  }

}

export const dbWriteEntry: DbInteractionFunc = async ({ table, data, index }): Promise<void> => {
  if (typeof data === 'undefined') throw 'A valid data object is required when calling dbWriteEntry().';
  try {
    const existingData = await readFromDb();
    const adapter = new JSONFile(dbPath);
    const db = new Low(adapter);

    if (typeof index === 'number') {
      for (let k in data) {
        // @ts-ignore
        existingData[table][index][k] = data[k as keyof SnlackUser | keyof SnykAuthData | keyof Installation];
      }
    } else {
      const lookupKey1: string | undefined = 'slackUid';
      const lookupKey2: string | undefined = 'snykUid';
      const lookupVal1: string | undefined = ('slackUid' in data) ? data.slackUid : undefined;
      const lookupVal2: string | undefined = ('snykUid' in data) ? data.snykUid : undefined;
      let existingEntryIndex: number | unknown;
      // See if there's a match.
      existingEntryIndex = await getDbEntryIndex({ table, key: lookupKey1, value: lookupVal1 });
      console.log('try 1: ', existingEntryIndex);
      // Try again
      if (typeof existingEntryIndex === 'undefined') {
        existingEntryIndex = await getDbEntryIndex({ table, key: lookupKey2, value: lookupVal2 })
        console.log('try 2: ', existingEntryIndex);
      }

      console.log(`While preparing to write to db, this is the existingEntryIndex value: ${existingEntryIndex}`);

      if (typeof existingEntryIndex !== 'undefined') {
        for (let k in data) {
          // @ts-ignore
          existingData[table][existingEntryIndex][k] = data[k as keyof SnlackUser | keyof SnykAuthData | keyof Installation];
        }
      } else {
        if (typeof data !== 'undefined') {
          // @TODO: I can't figure out this TS error.
          // @ts-ignore
          existingData[table].push(data);
        }
      }
    }

    db.data = existingData;
    return db.write();
  } catch (error) {
    console.error(`Encountered a problem trying to get a Db entry's index...\n${error}`);
    throw error;
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
  console.log(userEntryExists);
  const installEntryExists = await dbReadEntry({table: 'slackAppInstalls', key: 'userId', value: userEntry.slackUid});
  console.log(installEntryExists);

  console.log('Setting up a new bunch of db stuff.');
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
export const getDbEntryIndex: DbInteractionFunc = async({ table, key, value }): Promise<number | void> => {

  if (key === undefined) return;
  let matchedIndex: number | undefined;

  try {
    const existingData = await readFromDb();
    const lookupKey: string = key.toString();

    // Declare the variable we'll use to return the results of the read.
    // if (existingData[table] && (typeof key !== 'undefined' && typeof value !== 'undefined')) {
    existingData[table].map((entry: any, index) => {
      // Convert key to a string to be safe.
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
    console.error(`Error getting DB entry index: ${error}`);
  }

  console.log(`Before returning getDbEntryIndex had this matchedIndex: ${matchedIndex}`);
  console.log(`Matched index type = ${typeof matchedIndex}`);
  if (typeof matchedIndex !== 'undefined') {
    return matchedIndex;
  }
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
  // @TODO: Made a mess here with db / dbData.
  const dbData = await readFromDb();
  const adapter = new JSONFile<DB>(dbPath);
  const db = new Low(adapter);

  if (dbData && dbData[table]) {
    if (typeof key !== 'undefined' && typeof value !== 'undefined') {
      // @ts-ignore
      if (dbData[table].length === 1) {
        // @ts-ignore
        dbData[table] = [];
      } else {

        try {
          // Declare the variable we'll use to return the results of the read.
          dbData[table].map((entry: any, index) => {
            // Convert key to a string to be safe.
            const lookupKey = key.toString();
            // Handle nested object keys
            // @TODO: I don't understand why `boolean` isn't a valid function return type.
            lookupKey.split('.').reduce( (prev: any, curr: any): boolean | SnykAuthData | Installation | SnlackUser => {
              if (prev[curr] === value) {
                // console.log(`Found the requested entry: ${entry}. Deleting ${table}[${index}]`);
                // @TODO: - when the hell would it be null if we're here?
                // @ts-ignore
                db.data[table].splice(index, 1);
              }
              return prev[curr];
            }, entry);

          });

        } catch (error) {
          console.error(`Error mapping table entries in dbDeleteEntry(): ${error}`);
        }
      }

      // @ts-ignore;
      db.data = dbData;
      db.write();

    } else {
      throw new Error('Cannot read an entry from the database without a lookup key and comparison value.');
    }
  } else {
    console.log('There is no database data, we should be building a new DB.');
  }

}


export const getProjectIndexForEntry = async(project: string, userUid?: string) => {
  const argIsProjectID = validateUUID(project);
  const user = userUid || state.slackUid;
  const entry: SnlackUser = await dbReadEntry({table: 'users', key: 'slackUid', value: user}) as SnlackUser;

  const parentOrgIndex = await getProjectParentOrgIndexForEntry(project, user);

  const matchFn = (p: SnykProject) => p.name === project || p.id === project;

  return entry.snykOrgs![parentOrgIndex].projects.findIndex(matchFn);
}

/** Given a Project, return the array index for it's parent Org within an entry's `snykOrgs` array. */
export const getProjectParentOrgIndexForEntry = async(project: string, userUid?: string) => {
  console.log('parent org index for entry... project arg is: ', project);
  const user = userUid || state.slackUid;
  const entry: SnlackUser = await dbReadEntry({table: 'users', key: 'slackUid', value: user}) as SnlackUser;
  const projMatchFn = (p: SnykProject) => p.id === project || p.name === project;

  let parentOrgIndex: number = -1;

  entry.snykOrgs?.map( (org, index) => {
    if (parentOrgIndex === -1) {
      const pIndex = org.projects.findIndex(projMatchFn);
      console.log('pindex', pIndex);
      if (pIndex > -1) parentOrgIndex = index;
      console.log('returning it!', index);
    }
  });

  console.log('parent org index: ', parentOrgIndex);
  return parentOrgIndex;
}

export const getOrgIndexForEntry = async(org: string, userUid?: string) => {
  const user = userUid || state.slackUid;
  const entry: SnlackUser = await dbReadEntry({table: 'users', key: 'slackUid', value: user}) as SnlackUser;

  const orgMatchFn = (o: SnykOrg) => o.id === org || o.name === org;

  return entry?.snykOrgs?.findIndex(orgMatchFn);
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


