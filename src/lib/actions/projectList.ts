import { App as Slack, RespondArguments } from '@slack/bolt';
import { state } from '../../App';
import { createProjectDetailsBlock } from '../utils/createProjectDetailsBlock';

/**
 * Handles the interaction of the overflow menu on project list items.
 */
export const actionProjectListOverflow = (slack: Slack) => {
  slack.action('project_list_overflow_action', async ({ ack, body, respond, payload }) => {
    await ack();
    state.changeUser(body.user.id);

    if (payload.type === 'overflow') {
      // Split up the option value to make lookups easier.
      const parts: any = splitOptionValueString(payload.selected_option.value);

      try {
        const msg = await createProjectDetailsBlock(body.user.id, parts.entryOrgIndex, parts.entryProjIndex);
        await respond(msg as RespondArguments);
      }
      catch (error) {
        console.log('There was an error here.', error);
        await respond('Sorry, there was an error fetching details for that project.');
      }

    }
  });
}

/** Gets the important bits from the value of the selected option in the payload. */
const splitOptionValueString = (option: string) => {
  const optionParts = option.split('--');
  return {
    projectSlugName: optionParts[1],
    entryOrgIndex: parseInt(optionParts[2]), // The index of the Org object within the User's snykOrgs array.
    entryProjIndex: parseInt(optionParts[3]) // The index of the project within the Org object within the User's snykOrgs array. Confused yet?
  }
}
