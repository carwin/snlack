import { SnlackUser, SnykAPIVersion, SnykOrg } from '../../types';
import { dbReadEntry } from './';
import { callSnykApi } from './callSnykApi';
import { EncryptDecrypt } from './encryptDecrypt';

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
