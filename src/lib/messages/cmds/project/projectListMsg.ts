import slugify from 'slugify';
import { SnykProject, SnykProjectMsgParts } from '../../../../types';
import { createProjObj } from '../../../utils';

export const projectListMsg = ({projects, org, orgId, orgEntryIndex}: {projects: SnykProject[], org: string, orgId: string | boolean, orgEntryIndex: number}) => {

  // Initialize the blocks array for the returned message.
  let blocks: any[] = [];

  let projectBlocks: any[] = [];


  // Put together the blocks for each project.
  projects.map((project, index) => {
    if (project.org === org) {
      const projObj = createProjObj(project);
      const listItemBlocks = generateListItemMsgBlock(projObj, orgEntryIndex, index);
      projectBlocks = projectBlocks.concat(listItemBlocks);
    }
  });

  if (typeof orgId === 'boolean') {
    throw 'Org ID was a boolean while building a message. That is not good.';
  }

  // If there is at least one project to return, construct the response
  // using positive intro/outro dialog and the list of projects.
  if (projectBlocks.length >= 1) {
    // Add the positive intro block(s) to the message.
    blocks = blocks.concat(projListIntroBlocks({sentiment: 'positive', org }));
    // Add the blocks for each project to the message.
    blocks = blocks.concat(projectBlocks)
    // Add the finale.
    blocks = blocks.concat(projListFinaleBlocks({sentiment: 'positive', orgId}));
  }

  // If there are no projects to return, construct the response using negative
  // intro/outro dialog.
  else {
    // Add the negative intro block(s) to the message.
    blocks = blocks.concat(projListIntroBlocks({sentiment: 'negative', org}));
    // Add the finale.
    blocks = blocks.concat(projListFinaleBlocks({sentiment: 'negative', orgId}));
  }

  return {
    blocks,
    response_type: 'ephemeral'
  };

};



export const generateListItemMsgBlock = (project: SnykProjectMsgParts, orgIndexInUserEntry?: number, projIndexInUserOrgEntry?: number) => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`${project.name}\``,
      },
      accessory: {
        type: 'overflow',
        options: [
          {
            text: {
              type: 'plain_text',
              text: 'View on Snyk.io',
              emoji: true
            },
            url: `${project.browseUrl}`
          },
          {
            text: {
              type: 'plain_text',
              text: 'More details',
              emoji: true
            },
            // value: project,
            value: `proj-details--${slugify(project.name)}--${orgIndexInUserEntry}--${projIndexInUserOrgEntry}`,
            description: {
              type: 'plain_text',
              text: 'Get more details about this project.'
            }
          },
        ],
        action_id: 'project_list_overflow_action'
      }
    },
  ]
}

// Create the Intro statement for the project list message.  Depending on the
// results of the org / project comparison in the function that calls this, the
// message will be either positive or negative.
export const projListIntroBlocks = ({sentiment, org}: {sentiment: 'positive' | 'negative', org: string}) => {
  // Intro statements for the project list message response.
  let projListIntroStatementPositive: string;
  let projListIntroStatementNegative: string;
  if (org === 'All') {
    projListIntroStatementPositive = `Here are the known projects across all your Snyk organizations...\n_Use the overflow menu to the right of any project to see more options._`;
    projListIntroStatementNegative = `There are no known projects in any of your Snyk organizations.\nIf this is unexpected, it is likely that this App simply hasn't queried Snyk directly in a while.`;
  }
  else {
    projListIntroStatementPositive = `Here are the known projects in the *${org}* organization...\n_Use the overflow menu to the right of any project to see more options._`;
    projListIntroStatementNegative = `There are no known projects in the *${org}* organization.\nIf this is unexpected, it is likely that this App simply hasn't queried Snyk directly in a while.`;
  }

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Project List: ${org}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: sentiment === 'positive' ? projListIntroStatementPositive : projListIntroStatementNegative
      }
    },
  ];

};


// Return the finale / outtro blocks for the project list command response.
// Contains the button / action trigger for refreshing projects from Snyk.
// @TODO: Actually refresh projects from Snyk when this is clicked.
export const projListFinaleBlocks = ({ sentiment, orgId}: {sentiment: 'positive' | 'negative'; orgId: string; }) => {
  // Outtro statements for the project list message.
  const projListOuttroStatementPositive = `Don't see the project you're looking for? Try the button below to manually refresh data from Snyk.`;
  const projListOuttroStatementNegative = `This App keeps a local list of Snyk projects to avoid interacting with the Snyk API too often. You can trigger a refresh of the requested Org's project data using the button below.`

  return [
    {
      type: 'divider'
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: sentiment === 'positive' ? projListOuttroStatementPositive : projListOuttroStatementNegative
        }
      ]
    },
    {
      type: 'actions',
      block_id: 'project-list-actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Refresh Projects',
            emoji: false
          },
          action_id: 'projects_refresh',
          value: `org-id--${orgId}`,
        }
      ]
    }
  ];

};
