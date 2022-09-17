import { App as Slack } from '@slack/bolt';
import { state } from '../../App';
import { SnlackUser } from '../../types';
import { dbReadEntry, dbWriteEntry, getSnykAppOrgs } from '../utils';

/**  Refresh the user's Snyk Org data by calling Snyk's API. */
export const actionRefreshOrgs = async (slack: Slack) => {
  slack.action('orgs-refresh', async({ ack, payload, body, respond }) => {
    await ack();
    state.changeUser(body.user.id);

    if (payload.type === 'button') {

      const userEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: body.user.id }) as SnlackUser;

      if (typeof userEntry.snykTokenType !== 'undefined' && typeof userEntry.snykAccessToken !== 'undefined') {
        try {
          const refreshData = await getSnykAppOrgs(body.user.id, userEntry.snykTokenType, userEntry.snykAccessToken)
          .catch(error => console.log('Error received while refreshing Orgs...', error));

          if (typeof refreshData?.orgs !== 'undefined') {
            // After calling getSnykAppOrgs, it is possible the user's access and
            // refresh tokens have been changed, read the same user entry again
            // before attaching the new orgs to it.
            const refreshedUserEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: body.user.id }) as SnlackUser;

            refreshedUserEntry.snykOrgs = refreshData.orgs;

            await dbWriteEntry({ table: 'users', data: refreshedUserEntry });

            await respond({
              delete_original: false,
              replace_original: false,
              response_type: 'ephemeral',
              text: 'Data successfully refreshed from Snyk!'
            });
          }

        } catch(error) {
          await respond('There was a problem refreshing project data from Snyk. You may need to disable and re-enable the Snyk connection to Slack.');
          console.log('Error in actionRefreshOrgs()...', error);
        }
      } else {
        await respond(`Unable to find Snyk authorization for your user, have you visited this App's configuration page?`);
      }
    }
  });
}
