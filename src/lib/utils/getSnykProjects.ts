import { SnykAPIVersion, SnykOrg, SnykProject, SnlackUser } from '../../types';
import { callSnykApi } from './callSnykApi';
import jwt_decode from 'jwt-decode';
import { EncryptDecrypt } from './encryptDecrypt';
import { dbReadEntry, dbReadNestedEntry } from './';

interface V1ApiOrg {
  id: string;
  name: string;
}


export const getSnykProjects = async (slackCallerUid: string, tokenType: string, accessToken: string, orgId: string): Promise<{ org: SnykOrg, projects: SnykProject[] }> => {
  console.enter('Entering getSnykProjects()....\n Getting Snyk projects for user.');
  console.log(`args were: slackcalleruid - ${slackCallerUid}\ntokentype ${tokenType}\naccesstoken - ${accessToken}\norgId - ${orgId}`);
  const ed = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);

  console.log('access token at getSnykProjects: ', accessToken);
  // console.log('access token at getSnykProjects with decrypt string: ', ed.decryptString(accessToken));
  try {
    const result = await callSnykApi(
      tokenType,
      // ed.decryptString(accessToken), // @TODO encrypt / decrypt is behaving problematically.
      accessToken,
      SnykAPIVersion.V1,
    )({
      method: 'GET',
      url: `/org/${orgId}/projects`,
    });

    console.problem(`result of getSnykProjects: ${result.data}`);
    return result.data;
      // return result.data;
    // return {
      // Use v1 until rest endpoint supports indirect org access
      // orgs: result.data.data.map((org: RestApiOrg) => ({ id: org.id, name: org.attributes.name })),
      // projects: result.data.orgs.map((project: any) => ({ id: org.id, name: org.name })),
    // };

  }

  catch (error) {
    console.error('Oops - problem in getSnykProjects()');
    // @ts-ignore
    console.log(error.response.data);
    // @ts-ignore
    console.log(error.response.status);
    // @ts-ignore
    console.log(error.response.headers);
    // @ts-ignore
    console.log(error.request.headers);
  //   // throw error;
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
