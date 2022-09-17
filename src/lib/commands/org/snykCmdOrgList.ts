import { RespondArguments, RespondFn, SlackCommandMiddlewareArgs, SlashCommand } from '@slack/bolt';
import slugify from 'slugify';
import { SnlackUser, SnykCommandParts, SnykOrg } from '../../../types';
import { dbReadEntry } from '../../utils';

/** Command handler for `/snyk org list` and its derivatives. */
// export const snykCmdOrgList = async(rawCommand: SlashCommand, respond: RespondFn, {subcmd, ...params}: SnykCommandParts) => {
export const snykCmdOrgList = async(args: SlackCommandMiddlewareArgs): Promise<void> => {
  const rawCommandParts = args.command.text.split(' ');

  const [cmd, subcmd, ...params] = rawCommandParts;

  // User requested a list of orgs
  if (subcmd === 'list' && typeof params[0] === 'undefined') {
    // Look up the current user's Snyk Orgs.
    const userEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: args.command.user_id }) as SnlackUser;

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
        await args.respond(responseObj);
      }
      // There is no snykOrgs key...
      else {
        await args.respond(`There are no Orgs attached to your user. Try authenticating with Snyk from the App's config page.`)
      }

    }

  }

}

// @TODO - move these.
const snykOrgListIntroBlocks = () => {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Snyk Orgs Overview'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `The following list contains the Snyk organizations tied to your account.\n\n_This list may or may not be entirely accurate due to a number of factors, the foremost of which is a lack of access due to scoping decisions at the time this app was authorized with Snyk. If this situation applies to you, visit the configuration page for this app and deactivate / reactivate the Snyk connection to change your selected account scopes._`
      }
    },
    {
      type: 'divider'
    }
  ]
}

const snykOrgListFinaleBlocks = () => {
  return [
    {
      type: 'divider'
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_Not seeing the Snyk organization you're looking for? Try using the Refresh Orgs button below to sync with Snyk._`
        }
      ]
    },
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
          action_id: 'orgs-refresh',
          value: `orgs-refresh--true`
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
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `> ${org.name}`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Details',
            emoji: false
          },
          value: `org-id--${org.id}`,
          action_id: 'org-more-info',
        }
      },
      // {
      //   type: 'actions',
      //   block_id: `org-list-item-actions--${org.id}`,
      //   elements: [
      //     {
      //       type: 'button',
      //       text: {
      //         type: 'plain_text',
      //         text: 'View on Snyk.io',
      //         emoji: false
      //       },
      //       action_id: 'org_list_view_external',
      //       url: `https://app.snyk.io/org/${slugify(org.name)}`
      //     },
      //     {
      //       type: 'button',
      //       text: {
      //         type: 'plain_text',
      //         text: 'List Projects',
      //         emoji: false
      //       },
      //       action_id: 'org_list_view_projects',
      //       value: `org-id--${org.id}`,
      //       style: 'primary'
      //     }
      //   ]
      // },
    ]);

  })

  try {
    return listItemBlocks;
  } catch (error) {
    throw error;
  }

};
