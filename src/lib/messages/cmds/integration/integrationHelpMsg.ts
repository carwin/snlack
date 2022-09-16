import { RespondArguments } from "@slack/bolt";

// @TODO
export const integrationHelpMsg = (): RespondArguments => {
  return {
    replace_original: false,
    delete_original: false,
  }
}
