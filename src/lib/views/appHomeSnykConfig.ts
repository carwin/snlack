export class AppHomeConfigViewSnykModal {
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
          text: `After you've clicked the button below, you'll be redirected to Snyk.io to authorize this app. Once there, select the Snyk Organization(s) you'd like to allow this application to interact with.\n\nOnce the authorization is complete, head back here and test the waters by sending \`/snyk org list\` in any public channel.\n\n_If you ever run into issues, you can come back here and run through the authorization process again - if your issue was caused by an expired authorization token, this process should fix it_ :thumbsup:`
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
            url: `${process.env.SNYK_REDIRECT_URI}/snyk/preauth?slackUserId=${user}`,
            // url: `http://localhost:3000/snyk/auth?suid=${user}`,
            action_id: 'auth_snyk',
            style: 'primary'
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_*For developers*: You can learn more about Snyk Apps by visiting <https://docs.snyk.io/snyk-apps|Snyk's documentation page>!_`,
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
