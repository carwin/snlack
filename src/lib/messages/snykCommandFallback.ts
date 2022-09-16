import { RespondArguments, RespondFn } from "@slack/bolt";

export const snykCommandFallbackMsg = (): RespondArguments => {

  return {
    blocks: snykCommandFallbackMsgBlocks,
    response_type: 'ephemeral',
    delete_original: false,
    replace_original: false,
  }

}

const snykCommandFallbackMsgBlocks = [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: `The \`/snyk\` Slack Command`
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `You've discovered the \`/snyk\` set of commands! To use these commands, you'll want to ensure you've successfully connected your Snyk account to Slack. If you haven't, visit the '@Snyk (unofficial)' App home page in the left column to start the process.\n\n Below you'll find an overview of the main commands. If you run into issues with a particular command, you can add \`help\` as an extra parameter to receive more info.`
    },
  },
  {
    type: 'divider'
  },
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: `Snyk Organizations`
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `- *Get help with organization commands*\n\`\`\`/snyk org help\`\`\``,
    }
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `_Use this command for a detailed explanation of the available commands, their parameters, and options._`,
      }
    ]
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ` - *List your organizations*\n\`\`\`/snyk org list\`\`\``,
    }
  },
  {
    type: 'divider'
  },
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: `Snyk Projects`,
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `\`/snyk project <command> <parameters...>\``
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `- *Get help with project commands*\n\`\`\`/snyk project help\`\`\``,
    }
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `_Use this command for a detailed explanation of the available commands, their parameters, and options._`,
      }
    ]
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `- *List all projects*\n\`\`\`/snyk project list\`\`\``,
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `- *List projects within an organization*\n\`\`\`/snyk project list MyOrgName\`\`\``,
    }
  }
];
