import { RespondArguments } from "@slack/bolt";

// @TODO
export const licenseHelpMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
  }
}
