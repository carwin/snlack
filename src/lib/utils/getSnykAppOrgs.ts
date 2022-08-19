import { SnykAPIVersion, SnykOrg } from '../../types';
import { callSnykApi } from './callSnykApi';

interface RestApiOrg {
  id: string;
  attributes: {
    name: string;
  };
}

interface V1ApiOrg {
  id: string;
  name: string;
}

/**
 * Function to get app's accessible Snyk Org IDs, which are used in other API requests
 * @param {String} tokenType token type which is normally going to be bearer
 * @param {String} accessToken access token fetched on users behalf
 * @returns snykOrg data or throws and error
 */
export const getSnykAppOrgs = async (tokenType: string, accessToken: string): Promise<{ orgs: SnykOrg[] }> => {
  try {
    const result = await callSnykApi(
      tokenType,
      accessToken,
      SnykAPIVersion.V1,
    )({
      method: 'GET',
      url: `/orgs?version=2022-04-06~experimental`,
    });

    return {
      // Use v1 until rest endpoint supports indirect org access
      //orgs: result.data.data.map((org: RestApiOrg) => ({ id: org.id, name: org.attributes.name })),
      orgs: result.data.orgs.map((org: V1ApiOrg) => ({ id: org.id, name: org.name })),
    };
  } catch (error) {
    console.error('Error fetching org info: ' + error);
    throw error;
  }
}