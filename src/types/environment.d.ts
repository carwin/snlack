declare global {

  namespace NodeJS {

    interface ProcessEnv {
      PORT: string;
      SNYK_ENCRYPTION_SECRET: string;
      SNYK_CLIENT_ID: string;
      SNYK_CLIENT_SECRET: string;
      SLACK_SIGNING_SECRET: string;
      SLACK_CLIENT_ID: string;
      SLACK_CLIENT_SECRET: string;
      SLACK_BOT_TOKEN: string;
      SLACK_SOCKET_TOKEN: string;
    }

  }

}

export {}
