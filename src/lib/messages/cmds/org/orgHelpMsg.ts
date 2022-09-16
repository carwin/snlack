import { RespondArguments } from "@slack/bolt";

/** Constructs the Help message for Snyk Org related commands and activities. */
export const orgHelpMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
    blocks: orgHelpMsgBlocks
  }
}

/** Defines the Slack Block Kit blocks that make up the {@link orgHelpMsg } message */
const orgHelpMsgBlocks = [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: `Using the \`/snyk org\` Commands`
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `This group of commands is provided to facilitate interacting with your Snyk data at the Organization level. For most commands you have the option to pass the name of the Snyk organization or it's associated Org ID.`
    }
  },
  {
    type: 'divider'
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Org Command Help*`
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `- \`/snyk org help \`\n- \`/snyk org\` (alias)`
    }
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Prints this informational message.`,
      }
    ]
  },
  {
    type: 'divider'
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*List All Organizations*`
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `- \`/snyk org list \``
    }
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `This command returns a list of all the Snyk organizations to which you have access that the app is currently aware of. If the list is exceptionally long, it may be truncated to fit.\n\nIf an Organization you expect to see is not present, try the Refresh button that appears at the end of the response message.`,
      }
    ]
  },
];
