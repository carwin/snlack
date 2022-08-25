import {HomeView} from '@slack/bolt';
import { v4 as uuid4 } from 'uuid';

// Updates the contents of the Home tab.
// We can use this for modifying the details / content presented to users based
// on contexts like whether or not they've authorized with Snyk.

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
      blocks = this.homeBlocksPostSnyk(this.user);
    }

    return {
      blocks: blocks,
      type: this.type
    }

  }

  public createHome = async({data}: {data?: string}) => {
    console.log('User looking at home: ', this.user);
    // @TODO
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

    if(data) {
      // Should we perhaps provide App options here?
      // something like... db.push(`/${user}/data[]`, data, true);
    }

    const userView = this.updateView(false);

    return {
      user_id: this.user,
      view: userView
    }

    // return userView;
  };

  private homeBlocksPreSnyk = (user: string) => {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Welcome <@${user}>!, this is the home of the unofficial Snyk`
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
          text: `Click the button below to begin configuring the Snyk integration.`
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
