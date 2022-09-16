import { RespondArguments, RespondFn, SlashCommand } from '@slack/bolt';
import slugify from 'slugify';
import { SnlackUser, SnykCommandParts, SnykOrg } from '../../../types';
import { dbReadEntry } from '../../utils';

/** Command handler for `/snyk org list` and its derivatives. */
export const snykCmdOrgList = async(rawCommand: SlashCommand, respond: RespondFn, {subcmd, ...params}: SnykCommandParts) => {

  // User requested a list of orgs
  if (subcmd === 'list' && typeof params[0] === 'undefined') {
    // Look up the current user's Snyk Orgs.
    const userEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: rawCommand.user_id }) as SnlackUser;

    // If we have a userEntry...
    if (userEntry && typeof userEntry !== 'undefined') {

      // I must be too tired to understand why the compiler thinks this might be
      // undefined inside this condition...
      // @ts-ignore
      if (typeof userEntry !== 'undefined' && userEntry.snykOrgs.length >= -1) {
        // There is a snykOrgs key...
        let blocks = snykOrgListIntroBlocks();
        blocks = blocks
          .concat(snykOrgListItemBlocks(userEntry.snykOrgs!))
          .concat(snykOrgListFinaleBlocks() as []);

        const responseObj: RespondArguments = {
          blocks,
          delete_original: false,
          replace_original: false,
          response_type: 'ephemeral'
        }
        await respond(responseObj);
      }
      // There is no snykOrgs key...
      else {
        await respond(`There are no Orgs attached to your user. Try authenticating with Snyk from the App's config page.`)
      }

    }

  }

}

// @TODO - move these.
const snykOrgListIntroBlocks = () => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Here is the list of Orgs you have access to through this integration. Nice.`
      }
    }
  ]
}

const snykOrgListFinaleBlocks = () => {
  return [
    // {
    //   type: 'divider'
    // },
    // {
    //   type: 'context',
    //   elements: [
    //     {
    //       type: 'mrkdwn',
    //       text: `_Not seeing the Snyk organization you're looking for? Try using the Refresh Orgs button below to sync with Snyk._`
    //     }
    //   ]
    // },
    {
      type: 'actions',
      block_id: 'org-list-actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Refresh Orgs',
            emoji: false
          },
          action_id: 'orgs_refresh',
          value: 'org-refresh--true'
        }
      ]
    }
  ];

};

const snykOrgListItemBlocks = (orgs: SnykOrg[]) => {
  let listItemBlocks: any[] = [];
  orgs.map(org => {
    listItemBlocks = listItemBlocks.concat([
      {
        type: 'header',
        text: {
          type: 'plain_text',
          emoji: true,
          text: org.name
        }
      },
      {
        type: 'actions',
        block_id: `org-list-item-actions--${org.id}`,
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View on Snyk.io',
              emoji: false
            },
            action_id: 'org_list_view_external',
            url: `https://app.snyk.io/org/${slugify(org.name)}`
            // value: `org-id--${org.id}`,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'List Projects',
              emoji: false
            },
            action_id: 'org_list_view_projects',
            value: `org-id--${org.id}`,
            style: 'primary'
          }
        ]
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_This Snyk organization contains *${org.projects.length}* projects._`
          }
        ]
      },


    ]);

  })

  try {
    return listItemBlocks;
  } catch (error) {
    throw error;
  }

};
