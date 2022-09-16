import { RespondArguments } from '@slack/bolt';

export const projectHelpMsg = (): RespondArguments => {

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Using the \`/snyk project\` Commands`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `This group of commands is provided to facilitate interacting with your Snyk data at the Project level. Many of the responses to these commands have UI elements which provide various actions and operations.`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Project Command Help*`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `- \`/snyk project help \`\n- \`/snyk project\``
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
        text: `*List All Projects*`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `- \`/snyk project list \``
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `This command returns a list of all the projects the app is currently aware of, across *all* of your projects - truncated if necessary.`,
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
        text: `*List Projects In Snyk Organization*`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `- \`/snyk project list <Org Name>\`\n- \`/snyk project list <Org ID>\``
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `This command returns a list of all the projects the app is currently aware of, within a *specific project*. \n_E.g.:_\n_\`/snyk project list Kuberneatos\`_\n_\`/snyk project list 9123-94475-192384-abcdefg\`_\n This list will be truncated if necessary.`,
        }
      ]
    },

  ];

  return {
    blocks,
    response_type: 'ephemeral',
    replace_original: false,
    delete_original: false
  }

}
