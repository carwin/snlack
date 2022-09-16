import { SnlackUser } from '../../types';
import { dbReadEntry } from './db';

/**
 * Given a Snyk Org ID, return the Org's name if it is present in the local store.
 *
 * @example
 * ```
 * const orgName = await getSnykOrgNameById('<Slack User ID>', 'f0ddsxxx-pdpp-42ae-aaa0-3200bedbdd7f');
 * console.log(orgName); // => 'Kuberneato Mosquito'
 * ```
 */
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
