import { RespondFn, SlashCommand } from '@slack/bolt';

/**
 * Defines a common structure for the handler functions used by instances of SnykCommand.
 */
export type CmdHandlerFn = (rawCommand: SlashCommand, respond: RespondFn, {subcmd, ...params}: {subcmd: string;}) => Promise<void>;
