import { readFromDb } from '../../utils/app';
import { callSnykApi } from '../../utils/snyk/api';
import { EncryptDecrypt } from '../../utils/snyk';
import { SnykAPIVersion, AuthData, Envars } from '../../types';

/**
 * Get projects handler that fetches all user projects
 * from the Snyk API using user access token. This for
 * example purposes. In production it will depend on your
 * token scopes on what you can and can not access
 * @returns List of user project or an empty array
 */
export async function getProjectsFromApi(): Promise<unknown[]> {
  // Read data from DB
  const db = await readFromDb();
  const data = mostRecent(db.installs);
  // If no data return empty array
  if (!data) return [];

  // Decrypt data(access token)
  const eD = new EncryptDecrypt(process.env[Envars.SnykEncryptionSecret] as string);
  const access_token = eD.decryptString(data?.access_token);
  const token_type = data?.token_type;

  // Call the axios instance configured for Snyk API v1
  const requests = (data?.orgs ?? []).map((org) =>
    callSnykApi(token_type, access_token, SnykAPIVersion.V1)
      .post(`/org/${org.id}/projects`)
      .then((project) => ({
        org: org.name,
        projects: project.data.projects || [],
      })),
  );

  return Promise.all(requests);
}

/**
 *
 * @param {AuthData[]} installs get most recent install from list of installs
 * @returns the latest install or void
 */
export function mostRecent(installs: AuthData[]): AuthData | void {
  if (installs) {
    return installs[installs.length - 1];
  }
  return;
}
