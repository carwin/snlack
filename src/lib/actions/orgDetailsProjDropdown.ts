import { App as Slack, RespondArguments } from '@slack/bolt';
import { createProjectDetailsBlock } from '../utils';

/** A Slack action handler for the project dropdown in `/snyk org info` response messages. */
export const actionOrgDetailsProjDropdown = (slack: Slack) => {

  slack.action('org-details-proj-dropdown', async({ ack, body, respond, payload }) => {
    await ack();
    if (payload.type === 'static_select') {

      const parts: any = splitOptionValueString(payload.selected_option.value)

      const msg = await createProjectDetailsBlock(body.user.id, parts.orgIndex, parts.projIndex) as RespondArguments;
      await respond(msg);
    }

  });
}

/** Splits the org info message's project dropdown item values into usable parts. */
const splitOptionValueString = (option: string) => {
  const optionParts = option.split('--');

  return {
    orgIndex: parseInt(optionParts[1]),
    projIndex: parseInt(optionParts[2])
  }

}
