import { RespondArguments } from "@slack/bolt";

// @TODO
export const webhookListMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
  }
}
