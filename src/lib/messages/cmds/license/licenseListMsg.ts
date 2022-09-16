import { RespondArguments } from "@slack/bolt";

// @TODO
export const licenseListMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
  }
}
