declare global {
  // namespace Express {
  //   interface Request {
  //     session?: Session;
  //     sessionID?: string;
  //   }
  // }
  interface Console {
    enter(msg?: string): void;
    leave(msg?: string): void;
    problem(msg: string): void;
  }

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


// console.fn = {};
// console.fn.enter = fnEnter;
// console.fn.exit = fnExit;

export {}
