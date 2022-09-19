import slugify from 'slugify';
import { SnykIssue, SnykProject, SnykProjectMsgParts } from '../../../../types';
import { createProjObj } from '../../../utils';

export const projectIssuesListMsg = ({issues, project, projectId, projectEntryIndex}: {issues: SnykIssue[], project: string, projectId: string, projectEntryIndex: number}) => {
// export const projectIssuesListMsg = (project: SnykProjectMsgParts) => {
  // Initialize the blocks array for the returned message.
  let blocks: any[] = [];
  let issueBlocks: any[] = [];

  // For a test, add some random stuff to issues
  issues.push(
    {id: 'test-sample', issueType: 'SAST', cwe: ['007'], title: 'very-important-package@1.0.0', severity: 'high', ignored: false},
    {id: 'test-sample', issueType: 'SAST', cwe: ['007'], title: 'very-important-package@1.0.0', severity: 'high', ignored: false},
    {id: 'test-sample', issueType: 'SAST', cwe: ['007'], title: 'very-important-package@1.0.0', severity: 'high', ignored: false}
  );

  // Put together the blocks for each project.
  issues.length > 0 && issues.map((issue: SnykIssue, index: any) => {
    const listItemBlocks = generateProjectIssuesListBlocks(project, 'https://app.snyk.io');
    issueBlocks = issueBlocks.concat(listItemBlocks);
  });

  // Add the positive intro block(s) to the message.
  blocks = blocks.concat(projIssuesListIntroBlocks(project));

  // If there is at least one project to return, construct the response
  // using positive intro/outro dialog and the list of projects.
  // if (issueBlocks.length >= 1) {
    // Add the blocks for each project to the message.
    blocks = blocks.concat(issueBlocks)
  // }

  blocks = blocks.concat(projIssuesListFinaleBlocks(project, 'https://app.snyk.io'));

  return {
    blocks,
    response_type: 'ephemeral'
  };

};


// Create the Intro statement for the project list message.  Depending on the
// results of the org / project comparison in the function that calls this, the
// message will be either positive or negative.
export const projIssuesListIntroBlocks = (project: string, projectBrowseUrl?: string) => {
  // Intro statements for the project list message response.
  let projIssuesListIntroStatementPositive: string = `Here are the known issues in the *${project}* project...\n`;
  let projIssuesListIntroStatementNegative: string = `There are no known issues in the *${project}* project...\n`;

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Issues Found In The Project: \`${project}\``
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Thanks for using the unofficial Snyk for Slack app! Unfortunately you have just stumbled upon an area of the application that isn't quite ready yet. Below you can see a very rough draft for the kind of output you might get from this command, but for the moment, it is all test data.\n\nIf this is something you're really interested in, you can follow the project's updates by clicking the little Star icon on <https://github.com/carwin/snlack|GitHub>!`
      }
    },
  ];

};

export const generateProjectIssuesListBlocks = (project: string, browseUrl?: string) => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`sample-package\``,
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
            url: `${browseUrl ?? 'https://app.snyk.io'}`
          },
          {
            text: {
              type: 'plain_text',
              text: 'More details',
              emoji: true
            },
            // value: project,
            value: `proj-issue-details--abcsample`,
            description: {
              type: 'plain_text',
              text: 'Get more details about this issue.'
            }
          },
        ],
        action_id: 'project_issues_list_overflow_action'
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_*Severity*: Medium - *CWE*: <https://app.snyk.io|CWE-007> - *Issue Type*: SAST_`
        }
      ]
    },

  ]
}

  const projIssuesListFinaleBlocks = (project: string, browseUrl?: string) => [
    {
      type: 'divider'
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `That's all for now! But just as another reminder, none of this data you see above is real -- it is all sample text designed to provide a visual example of what this command's output might look like when/if implemented.`
        }
      ]
    },

  ]
