import { RespondArguments } from '@slack/bolt';

export const projectDependencyMissingArgMsg = (): RespondArguments => {

  return {
    delete_original: false,
    replace_original: false,
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'You must provide a Project argument to the dependency list command. For more details, try \`/snyk project help\`.'
        }
      }
    ]
  }

}
