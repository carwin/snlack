import { SnykAPIVersion, SnykOrg, SnykProject, SnlackUser } from '../../types';
import { callSnykApi } from './callSnykApi';
import { dbReadEntry, dbReadNestedEntry } from './';

export const getSnykProjects = async (slackCallerUid: string, tokenType: string, accessToken: string, orgId: string): Promise<{ org: SnykOrg, projects: SnykProject[] }> => {
  console.log('getting Snyk projects for user');

  try {
    const result = await callSnykApi(
      tokenType,
      accessToken,
      SnykAPIVersion.V1,
    )({
      method: 'GET',
      url: `/org/${orgId}/projects`,
      params: {
        slackCaller: slackCallerUid
      }
    });

    console.log('result of getSnykProjects:', result.data);
    return result.data;

    // {
      // Use v1 until rest endpoint supports indirect org access
      //orgs: result.data.data.map((org: RestApiOrg) => ({ id: org.id, name: org.attributes.name })),
      // orgs: result.data.orgs.map((org: V1ApiOrg) => ({ id: org.id, name: org.name })),
    // };
  } catch (error) {
    console.error('Oops');
    // console.error('Error fetching project info: ' + error);
    // throw error;
    throw 'oops';
  }

}

/**
 * Given a Snyk Org name, return the Org's ID if it is present in the local store.
 *
 * @example
 * const orgId = await getSnykOrgIdByName('Kuberneato Mosquito');
 * console.log(orgId); // => f0ddsxxx-pdpp-42ae-aaa0-3200bedbdd7f
 **/
export const getSnykOrgIdByName = async (orgName: string): Promise<string | false> => {
  // @TODO another TS signature definition issue.
  // @ts-ignore
  const lookup: SnlackUser | false = await dbReadNestedEntry({ table: 'users', nestedTable: 'snykOrgs', key: 'name', value: orgName });
  console.log('Lookup found ', lookup);
  let lookupId: string | false = false;
  if (typeof lookup !== 'boolean' && typeof lookup?.snykOrgs !== 'undefined') {
    lookup.snykOrgs.map( (org: SnykOrg) => {
      if (org.name === orgName) lookupId = org.id;
    })
  }
  return lookupId;
}
