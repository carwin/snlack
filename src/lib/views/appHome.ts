import {HomeView} from '@slack/bolt';
import { v4 as uuid4 } from 'uuid';
import { readFromDb, getDbEntryIndex } from '../utils';
import { appSettingsFormBlocks } from './appHomeConfig';

/**
 * SlackHomeView
 *
 * @remarks
 * > Why did I make this into a class?
 *
 * Updates the contents of the Home tab.
 * We can use this for modifying the details / content presented to users based
 * on contexts like whether or not they've authorized with Snyk.
 *
 * @example
 * ```
 * slack.event('app_home_opened', async({ event, client, context }) => {
 *   ...
 *   const slackAppHome: SlackHomeView = new SlackHomeView({user: event.user});
 *   const view = await slackAppHome.createHome({});
 *   ...
 * });
 * ```
 */
export class SlackHomeView implements HomeView {
  public type: 'home';
  public blocks;
  public user: string;

  constructor({user, snykAuthStatus}: {user: string, snykAuthStatus?: boolean}) {
    this.user = user;
    this.type = 'home';

    const initialView = this.updateView(false);
    this.blocks = initialView.blocks;
  }

  private updateView = (snykAuth: boolean) => { // @TODO
    console.log('Updating Home view...');
    let blocks: any[] = this.homeBlocksPreSnyk(this.user);
    if (snykAuth === true) {
      // !!!!!!!!!!!!!!!!
      // @TODO - This view isn't ready for the world, we're going to ignore it for MVP.
      // !!!!!!!!!!!!!!!!
      // blocks = appSettingsFormBlocks.concat(this.homeBlocksPostSnyk(this.user) as []);
    }

    return {
      blocks: blocks,
      type: this.type
    }

  }

  public createHome = async({data}: {data?: string}) => {
    console.log('User looking at home: ', this.user);
    // This is where we'll want to look up whether or not the user has
    // authenticated with Snyk. If they have, we should show them the Remove
    // Integration button and provide any other settings we might want to make
    // available.
    //
    // Pseudo logic:
    //   let snykAuth = false;
    //   if ( db.dbLookup(user).snykAuthToken ) {
    //       snykAuth = true;
    //   }
    try {
      const db = await readFromDb();
      const userDbEntryIndex = await getDbEntryIndex({ table: 'users', key: 'slackUid', value: this.user });
      // @ts-ignore
      const userDbEntry = typeof userDbEntryIndex !== 'boolean' ? db.users[userDbEntryIndex] : false;

      let userView;

      // If this user isn't in the db yet, how are they here? If they are and
      // don't have a snykUid, they must not have authenticated with Snyk yet.
      if (!userDbEntry || typeof userDbEntry.snykUid === 'undefined') {
        userView = this.updateView(false);
      } else {
        userView = this.updateView(true);
      }

      if(data) {
        // Should we perhaps provide App options here?
        // something like... db.push(`/${user}/data[]`, data, true);
      }

      // const userView = this.updateView(false);

      return {
        user_id: this.user,
        view: userView
      }
    } catch (error) {
      console.error(`There was an error creating the App's Home view: ${error}`);
      throw error;
    } finally {
    }
    // return userView;
  };

  private homeBlocksPreSnyk = (user: string) => {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Welcome <@${user}>!, this is the home of the unofficial Snyk App for Slack.\n\nThis app serves primarily as a demonstration of what is possible for developers utilizing the <https://docs.snyk.io/snyk-apps|Snyk Apps> platform to develop integrations. Though much of what you may find here is meant as an example, there is still plenty of useful functionality.\n`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Configuration',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Before you'll be able to interact with this application, you'll need to authorize this App to communicate with your Snyk account. This authorization is one of the cornerstones of the Snyk Apps design paradigm and its built on top of the OAuth2 specification (much like the Slack authentication process you went through).`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Configure Snyk',
              emoji: true
            },
            value: `${user}`,
            // url: `http://localhost:3000/snyk/preauth?slackUserId=${user}`,
            // url: `http://localhost:3000/snyk/auth?suid=${user}`,
            action_id: 'config_snyk'
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: `This application leverages the Snyk Apps platform and Snyk's REST API.`,
            emoji: true
          }
        ]
      },
    ];
  }
  private homeBlocksPostSnyk = (user: string) => {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Authorize Snyk',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Congrats! You've successfully authorized with Snyk. Enjoy the integration!`
        }
      },
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Disconnect from Snyk',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `If you'd like to disconnect from Snyk and disable this integration, click the button below.`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Disable Snyk Authorization',
              emoji: true
            },
            value: `${user}`,
            action_id: 'deauth_snyk'
          }
        ]
      }

    ];
  }
}

// export const updateView = async(user: string) => {

//   let blocks = [
//     {
//       type: 'section',
//       text: {
//         type: 'mrkdwn',
//         text: `Welcome <@${user}>!, this is the home of the unofficial Snyk`
//       }
//     },
//     {
//       type: 'divider'
//     },
//     {
//       type: 'header',
//       text: {
//         type: 'plain_text',
//         text: 'Authorize Snyk',
//         emoji: true
//       }
//     },
//     {
//       type: 'section',
//       text: {
//         type: 'mrkdwn',
//         text: `Before you can leverage this app's Slack commands or interact with the bot, you'll need to authorize the app with Snyk to allow it to access your data.\n\n Click the button below to get started.`
//       }
//     },
//     {
//       type: 'actions',
//       elements: [
//         {
//           type: 'button',
//           text: {
//             type: 'plain_text',
//             text: 'Connect to Snyk',
//             emoji: true
//           },
//           value: `${user}`,
//           // url: 'http://localhost:3000/snyk/preauth',
//           action_id: 'auth_snyk'
//         }
//       ]
//     },
//     {
//       type: 'context',
//       elements: [
//         {
//           type: 'plain_text',
//           text: `This application leverages the Snyk Apps platform and Snyk's REST API.`,
//           emoji: true
//         }
//       ]
//     },
//     {
//       type: 'divider'
//     },
//   ]

// }

// // Display App Home
// export const createHome = async({user, data}: {user: string, data?: string}) => {
//   console.log('User looking at home: ', user);
//   if(data) {
//     // Store something in a local DB maybe...
//     // Perhaps users will do more than just click the Auth button.
//     // Should we perhaps provide App options here?
//     //
//     // something like... db.push(`/${user}/data[]`, data, true);
//   }

//   const userView = await updateView(user);

//   return userView;
// };
