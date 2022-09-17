import { RespondArguments } from '@slack/bolt';
import { validate as uuidValidate } from 'uuid';
import { state } from '../../App';
import { SnlackUser, SnykAPIVersion, SnykOrg } from '../../types';
import { orgInfoMsg } from '../messages';
import { callSnykApi } from './callSnykApi';
import { dbReadEntry } from './db';

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
 * Function to get app's accessible Snyk Org IDs, which are used in other API
 * requests.
 *
 * @param {String} tokenType token type which is normally going to be bearer
 * @param {String} accessToken access token fetched on users behalf
 * @returns snykOrg data or throws and error
 */
export const getSnykAppOrgs = async (slackCallerUid: string, tokenType: string, accessToken: string): Promise<{ orgs: SnykOrg[] }> => {

  try {
    const result = await callSnykApi(
      tokenType,
      accessToken,
      SnykAPIVersion.V1,
    )({
      method: 'GET',
      url: `/orgs?version=2022-04-06~experimental`,
      params: {
        slackCaller: slackCallerUid // @TODO - I think I'm leaning towards just using that global `state` instead of trying to do this.
      }
    });

    return {
      // Use v1 until rest endpoint supports indirect org access
      //orgs: result.data.data.map((org: RestApiOrg) => ({ id: org.id, name: org.attributes.name })),
      orgs: result.data.orgs.map((org: V1ApiOrg) => ({ id: org.id, name: org.name, projects: [] })),
    };
  } catch (error) {
    console.error('Error fetching org info: ' + error);
    throw error;
  }
}


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

/**
 * Retrieves information about a particular Snyk Organization
 *
 * @remarks
 * The reason this exists is so that Slack _actions_ as well as _slash commands_
 * can present the same data using just one function.  This is formatted for use
 * with the `respond()` function, but could easily be dumbed down even further
 * to make it more useful.
 *
 * @param org
 */
export const getSnykOrgInfo = async (org: string, userId?: string) => {
  const slackUser = userId || state.slackUid;
  const orgParamIsUUID = uuidValidate(org);

  console.log('here', org);
  const userEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: slackUser }) as SnlackUser;
  console.log('here', userEntry);

  if (userEntry && typeof userEntry !== 'undefined') {
    const orgIndexMatch = (o: SnykOrg) => orgParamIsUUID ? o.id === org : o.name === org;
    const orgIndex = userEntry.snykOrgs?.findIndex(orgIndexMatch);

    if (typeof orgIndex !== 'undefined') {
      const org = userEntry.snykOrgs![orgIndex];

      // const msg = orgInfoMsg(org, rawCommand.user_id);
      const msg: RespondArguments = orgInfoMsg(org, orgIndex, userEntry);

      return(msg);

    }

  }
  else {
    return<RespondArguments>({
      delete_original: false,
      replace_original: false,
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `There are no Orgs attached to your user. Try authenticating with Snyk from the App's configuration page.`
          }
        }
      ]
    })
  }
}
