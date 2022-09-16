import { RespondArguments } from "@slack/bolt";

// @TODO
export const webhookCreateMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
  }
}
