import { RespondArguments } from "@slack/bolt";

// @TODO
export const integrationListMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
  }
}
