import { Block, KnownBlock, RespondArguments } from "@slack/bolt";
import { SnlackUser, SnykOrg } from "../../../../types";

/** Returns the `RespondArguments` for the `/snyk org info` commands response. */
export const orgInfoMsg = (org: SnykOrg, orgIndex: number, userEntry: SnlackUser): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
    blocks: orgInfoMsgBlocks(org, orgIndex, userEntry)
  }
}

/** Returns the message blocks for the Org info message. */
const orgInfoMsgBlocks = (org: SnykOrg, orgIndex: number, userEntry: SnlackUser): (Block | KnownBlock)[] => {

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Snyk Org Details: ${org.name}`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Get information about projects within this organization by selecting a project from the dropdown.`
      },
      accessory: {
        type: 'static_select',
        placeholder: {
          type: 'plain_text',
          text: 'Get Project Details...',
          emoji: false
        },
        options: generateOrgItemProjectsSelectOptions(org, orgIndex, userEntry),
        action_id: 'org_details-proj-dropdown',
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Org ID*: _\`${org.id}\`_`
        },
        {
          type: 'mrkdwn',
          text: ` | `
        },
        {
          type: 'mrkdwn',
          text: `*Projects*: _${org.projects.length}_`
        },
      ]
    },
  ]

  return blocks;
}


export const generateOrgItemProjectsSelectOptions = (org: SnykOrg, orgIndex: number, userEntry: SnlackUser) => {
  let options: any[] = [];

  org.projects.map((project, index) => {

    let trimmedProjectName = project.name.substring(project.name.length - 29);
    if (trimmedProjectName.length >= 27) trimmedProjectName = `...${trimmedProjectName}`;

    options.push({
      text: {
        type: 'plain_text',
        text: trimmedProjectName,
        emoji: true,
      },
      // description: {
      //   type: 'plain_text',
      //   text: descriptionString,
      //   emoji: true
      // },
      value: `value--${orgIndex}--${index}`,
    })
  })

  return options;
}
