import { SnlackUser, SnykOrg } from '../../types';
import { dbReadEntry } from './db';

/**
 * Given a Snyk Org name, return the Org's ID if it is present in the local store.
 *
 * @example
 * ```
 * const orgId = await getSnykOrgIdByName('<Slack User ID>', 'Kuberneato Mosquito');
 * console.log(orgId); // => f0ddsxxx-pdpp-42ae-aaa0-3200bedbdd7f
 * ```
 **/
export const getSnykOrgIdByName = async (slackUid: string, orgName: string): Promise<string | false> => {
  const data: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: slackUid }) as SnlackUser;

  if (!data.snykOrgs) throw 'This user has no Snyk organizations to use for lookup.';

  let orgId: string | undefined;

  data.snykOrgs.map((org: SnykOrg) => {
    if (org.name === orgName) orgId = org.id;
  });

  // if (typeof orgId === 'undefined' || !orgId) return `A Snyk organization matching ${orgName} could not be found in the user's entry.` as string;
  if (typeof orgId === 'undefined' || !orgId) return false;

  return orgId;
}
