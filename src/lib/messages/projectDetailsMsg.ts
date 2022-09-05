import { SnykProjectMsgParts } from '../../types';

const divider = {
  type: 'divider'
}

export const projectDetailsMsg = (project: SnykProjectMsgParts) => {
  let blocks: any[] = [];

  const projectDetailsIntro = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${project.name}`,
        emoji: true
      }
    },
  ];

  blocks = blocks.concat(projectDetailsIntro);
  blocks = blocks.concat(generateProjectDetailsBlocks(project));

  return {
    blocks,
    response_type: 'ephemeral',
    replace_original: false,
    delete_original: false,
  };

};

const generateProjectDetailsBlocks = (project: SnykProjectMsgParts) => {

  console.log('We want details on this project: ', project);

  const testDateConverted = new Date(project.lastTestDate);
  const testDate = testDateConverted.toDateString();
  const { critical, high, medium, low } = project.issuesCount;

  const detailBlocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_in *${project.org}*, imported by ${project.importingUser}_`
      },
      fields: [
        {
          type: 'mrkdwn',
          text: `*Type*: ${project.projType}`
        },
        {
          type: 'mrkdwn',
          text: `*Origin*: \`${project.origin}\``
        },
        {
          type: 'mrkdwn',
          text: `*Monitored*: ${project.isMonitored.charAt(0).toUpperCase()}${project.isMonitored.substring(1, project.isMonitored.length)}`
        },
        {
          type: 'mrkdwn',
          text: `*Read-only*: ${project.readOnly.charAt(0).toUpperCase()}${project.readOnly.substring(1, project.readOnly.length)}`
        },
        {
          type: 'mrkdwn',
          text: `*Test Frequency*: ${project.testFrequency}`
        },
        {
          type: 'mrkdwn',
          text: `*Total Dependencies*: ${project.depCount}`
        },
        {
          type: 'mrkdwn',
          text: `*Last tested*: ${testDate}`
        }
      ]
    },
    {
      type: 'divider'
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Issues*: _:red_circle:${critical}   :large_yellow_circle:${high}   :large_blue_circle:${medium}   :white_circle:${low}_\n<${project.browseUrl}|View on Snyk.io>`
        }
      ]
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Issues',
            emoji: true
          }
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Do something else',
            emoji: true
          }
        },
      ]
    }
  ];

  // Handle optional Container / Image properties.
  // ---------------------------------------------
  const containerProperties = ['imageTag', 'imagePlatform', 'imageId'];
  let showContainerProps: boolean = false;

  // If any of the "container" props have a value, show this set of container
  // specific blocks.
  for (let i = 0; i < containerProperties.length; i++) {
    if (typeof project[containerProperties[i]] !== 'undefined') {
      showContainerProps = true
      break;
    }
  }

  if (showContainerProps) {
    const containerBlocks = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ` `
      },
      fields: [
        {
          type: 'mrkdwn',
          text: `*Image Tag*: \`${project.imageTag}\``
        },
        {
          type: 'mrkdwn',
          text: `*Image Platform*: \`${project.imagePlatform}\``
        },
        {
          type: 'mrkdwn',
          text: `*Image ID*: \`\`\`${project.imageId}\`\`\``
        }
      ]
    };

    detailBlocks[0].fields! = detailBlocks[0].fields!.concat(containerBlocks.fields);
  }

  return detailBlocks;
};
