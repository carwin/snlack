import { RespondArguments } from "@slack/bolt";

// @TODO
export const webhookHelpMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
  }
}
