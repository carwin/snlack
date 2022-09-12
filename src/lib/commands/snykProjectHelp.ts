import { RespondArguments, RespondFn, SlashCommand } from "@slack/bolt";
import { SnykCommandParts } from "../../types";
import { projectHelpMsg } from "../messages";

export const snykProjectHelpCommandHandler = async(rawCommand: SlashCommand, respond: RespondFn, { subcmd, param, param2, param3 }: SnykCommandParts) => {
  const msg: RespondArguments = projectHelpMsg();
  await respond(msg);
}
