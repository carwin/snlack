import { RespondArguments } from '@slack/bolt';
import slugify from 'slugify';
import { SnykDependency, SnykProject } from '../../../../types';

/** Builds the message containing a project's dependency list. */
export const projectDepsMsg = (project: SnykProject, deps: SnykDependency[]): RespondArguments => {

  const intro = projectDepsIntroBlocks(project.name);
  const outtro = projectDepsOutroBlocks(project.id);

  let blocks: any[] = [];

  if (deps && deps.length > -1) deps.map( (dep: SnykDependency) => blocks = blocks.concat(projectDepListItemBlock(dep)) )

  // Handle instances where blocks might be empty.
  if (blocks.length === 0) blocks = [{ type: 'section', text: { type: 'plain_text', text: 'There are no interesting dependencies to view, or there was trouble while generating the message list blocks'}}];
  // Manage truncation of message.
  if (blocks.length > 35) {
    blocks = blocks.slice(0, 33);
  }

  const p1 = intro.concat(blocks);
  // @ts-ignore
  const p2 = p1.concat(outtro);

  return {
    replace_original: false,
    delete_original: false,
    blocks: p2,
  }
}

// Add the Intro blocks
const projectDepsIntroBlocks = (project: string) => [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: `Dependency List: ${project}`
    }
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `It is likely that this list is not a complete reflection of your project's dependencies. Due to Slack message limits, this list may be truncated. Options for retrieving a non-truncated dependency list / tree are available at the bottom of this message block.`
    }
  }
]

const projectDepListItemBlock = (dep: SnykDependency) => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Name*: \`${dep.name}\` ⸱ *Type*: ${dep.type} ⸱ *Version*: ${dep.version}`
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_critical: ${dep.issuesCritical}  high: ${dep.issuesHigh}  medium: ${dep.issuesMedium} low: ${dep.issuesLow}_`
        }
      ]
    },
    {
      type: 'divider'
    },
  ]
}

const projectDepsOutroBlocks = (project: string) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `If your list of dependencies is truncated, you can retrieve the full list in plaintext format by clicking the *Create Snippet* button below. Stay tuned for further improvements!`
    }
  },
  {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Create Snippet'
        },
        value: `project--${slugify(project)}`,
        action_id: 'get-proj-dep-snippet'
      }
    ]
  }
]

/** @deprecated */
const projectDepDetailBlock = (dep: SnykDependency) => {

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: dep.name
      }
    },
    {
      context: {
        elements: [
          {
            type: 'mrkdwn',
            text: `${dep.id}`
          }
        ]
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Type*: ${dep.type}`,
        }
      ]
    }
  ]

}
