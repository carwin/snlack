const { WebClient } = require("@slack/web-api");

class Workspace {
  constructor(installation) {
    let team = installation["team"];
    let token = installation["bot"]["token"];

    this.id = team.id;
    this.name = team.name;
    this.client = new WebClient(token);
  }

  // Ref: https://api.slack.com/docs/pagination
  async *getPaginatedUsers() {
    let cursor;

    while (true) {
      let opts = { limit: 200 };
      if (cursor) {
        opts["cursor"] = cursor;
      }
      let res = await this.client.users.list(opts);
      yield res.members;
      if ("response_metadata" in res) {
        let data = res["response_metadata"];
        if ("next_cursor" in data && data["next_cursor"].length > 0) {
          cursor = data["next_cursor"];
          continue;
        }
      }
      break;
    }
  }

  static isValidUser(user) {
    if (user["id"] === "USLACKBOT" || user["is_bot"] || user["deleted"]) {
      return false;
    }
    return true;
  }

  // Get users, filtering out bots and deleted users.
  async *users() {
    for await (const users of this.getPaginatedUsers()) {
      yield users.filter(Workspace.isValidUser);
    }
  }

  // Get the URL to open a direct message.
  async directMessage(userId) {
    const url = "https://slack.com/app_redirect";
    const res = await this.client.conversations.open({ users: String(userId) });

    if (res["ok"] === false) {
      console.log(res["error"]);
      return;
    }

    const channelId = res["channel"]["id"];
    return `${url}?team=${this.id}&channel=${channelId}`;
  }
}

module.exports = Workspace;
