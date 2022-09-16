import { RespondArguments } from "@slack/bolt";

// @TODO
export const webhookPingMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
  }
}
