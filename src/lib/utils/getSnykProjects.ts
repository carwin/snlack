import { SnykAPIVersion, SnykOrg, SnykProject, SnlackUser } from '../../types';
import { callSnykApi } from './callSnykApi';
import jwt_decode from 'jwt-decode';
import { EncryptDecrypt } from './encryptDecrypt';
import { dbReadEntry, dbReadNestedEntry } from './';

import axios from 'axios';

interface V1ApiOrg {
  id: string;
  name: string;
}


export const getSnykProjects = async(slackCallerUid: string): Promise<unknown[]> => {
  const data = await dbReadEntry({table: 'users', key: 'slackUid', value: slackCallerUid }) as SnlackUser;

  if (!data || typeof data === 'undefined') return [];

  const eD = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);
  const access_token = eD.decryptString(data?.snykAccessToken as string);
  const token_type = data?.snykTokenType;

  // Call the axios instance configured for Snyk API v1.
  const requests = (data?.snykOrgs ?? []).map((org) =>
    callSnykApi(token_type as string, access_token, SnykAPIVersion.V1)
      .post(`/org/${org.id}/projects`)
      .then((project): SnykOrg => ({
        name: org.name,
        id: org.id,
        projects: project.data.projects || [],
      }))
      .catch((error) => {

        console.log('callSnykApi from getSnykProjects() Promise has been rejected.');

        console.log('Maybe there was an error?', error);
      }),
                                             );

  return Promise.all(requests);
}

/**
 * Given a Snyk Org name, return the Org's ID if it is present in the local store.
 *
 * @example
 * const orgId = await getSnykOrgIdByName('<Slack User ID>', 'Kuberneato Mosquito');
 * console.log(orgId); // => f0ddsxxx-pdpp-42ae-aaa0-3200bedbdd7f
 **/
export const getSnykOrgIdByName = async (slackUid: string, orgName: string): Promise<string | false> => {
  // @TODO another TS signature definition issue.
  // @ts-ignore
  // const lookup: SnlackUser | false = await dbReadNestedEntry({ table: 'users', nestedTable: 'snykOrgs', key: 'name', value: orgName });
  const data = await dbReadEntry({ table: 'users', key: 'slackUid', value: slackUid }) as SnlackUser;

  if (!data.snykOrgs) throw 'This user has no Snyk organizations to use for lookup.';

  let orgId: string | undefined;

  data.snykOrgs.map((org) => {
    if (org.name === orgName) orgId = org.id;
  });

  // if (typeof orgId === 'undefined' || !orgId) return `A Snyk organization matching ${orgName} could not be found in the user's entry.` as string;
  if (typeof orgId === 'undefined' || !orgId) return false;

  return orgId;
}

export const getSnykOrgNameById = async (slackUid: string, orgId: string): Promise<string | false> => {
  const data = await dbReadEntry({ table: 'users', key: 'slackUid', value: slackUid }) as SnlackUser;

  if (!data.snykOrgs) throw 'This user has no Snyk organizations to use for lookup.';

  let orgName: string | undefined;

  data.snykOrgs.map((org) => {
    if (org.id === orgId) orgName = org.name;
  });

  if (typeof orgName === 'undefined' || !orgName) return false;

  return orgName;
}
