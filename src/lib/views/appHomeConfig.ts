export class AppHomeConfigView {
  public type: 'modal';
  public callback_id: string;
  public user: string;
  public view: any;

  constructor({user, snykAuthStatus}: {user: string, snykAuthStatus?: boolean}) {
    this.user = user;
    this.callback_id = 'snykConfig';
    this.type = 'modal';
    this.view = this.initView();
  }

  public initView = () => {
    const viewBlocks = this.setupViewBlocks(false);
    return {
      type: 'modal',
      title: {
        type: 'plain_text',
        text: 'Configure Snyk'
      },
      blocks: viewBlocks,
      close: {
        text: 'Close',
        type: 'plain_text',
      },
      callback_id: 'stringcallbackid',
    }

  }

  private setupViewBlocks = (snykAuth: boolean) => {
    const user = this.user;
    let blocks: any[] = this.viewBlocksPreSnykAuth(this.user);
    // stub.
    if (snykAuth === true) {
      blocks = this.viewBlocksPostSnykAuth(this.user);
    }

    return blocks;
  }

  private viewBlocksPreSnykAuth = (user: string) => {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Before you can leverage this app's Slack commands or interact with the bot, you'll need to authorize the app with Snyk to allow it to access your data.\n\n Click the button below to get started.`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Connect to Snyk',
              emoji: true
            },
            value: `${user}`,
            url: `http://localhost:3000/snyk/preauth?slackUserId=${user}`,
            // url: `http://localhost:3000/snyk/auth?suid=${user}`,
            action_id: 'auth_snyk'
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

  private viewBlocksPostSnykAuth = (user: string) => {
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
