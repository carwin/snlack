import { RespondArguments } from "@slack/bolt";

// @TODO
export const orgListMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
  }
}
