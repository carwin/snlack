/**
 * @module SnykCommand
 */
import { AllMiddlewareArgs, RespondFn, SlackCommandMiddlewareArgs, SlashCommand } from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';
import { CmdHandlerFn } from '../../types';

/**
 * Used to instantiate the "cmds' that live under the parent `/slack` command.
 *
 * **Instances of this class are expected to be placed within the context of
 *  Bolt's `slack.command('/snyk', etc...)`.**
 *
 * As a Slack "slash" command, this may be an atypical setup, but its designed
 * to imitate a CLI application. The root command `/snyk` acts as the entrypoint
 * (analagous to the application binary if we continue to think of this like a
 * CLI app).
 *
 * The second word, which we'll call the "`cmd`" defines the context
 * of the command.
 *
 * The word immediately following the `cmd` defines the action
 * to be taken within the `cmd`'s context. We'll call this word the `subcmd`.
 *
 * The `cmd`s may take one or more arguments after the `subcmd`, we'll reference
 * these within the command handlers as `params` using the `...` rest operator.
 * Generally speaking, we're unlikely to have more than three params.
 *
 * @example
 * ```
 * slack.command('/snyk', async({ ack, respond, context, whatever }) => {
 *   await ack();
 *   // -> /snyk project help
 *   new SnykCommand('project', 'help', myHandlerFn1, middlewareArgs);
 *   // -> /snyk project list
 *   new SnykCommand('project', 'list', myHandlerFn2, middlewareArgs);
 *   // -> /snyk project delete SomeProject
 *   new SnykCommand('project', 'delete', myHandlerFn3, middlewareArgs);
 * });
 * ```
 *
 * @group Commands
 *
 */
export class SnykCommand {
  /** Represents the context of the `/snyk` command.*/
  readonly cmd: string;
  /** Represents the action to be taken in the context of the `/snyk` command.*/
  readonly subcmd: string;
  /** The handler function to be called for the provided combination of `cmd` and `subcmd`. */
  readonly cmdHandler: CmdHandlerFn;

  /**
   * The constructor of the `SnykCommand` class.
   *
   * @param cmd the top-level context of this instance of the `/snyk` command.
   * @param subcmd the action to be taken in the context of the `/snyk` command.
   * @param cmdHandler handler function to be called for this SnykCommand.
   */
  constructor(cmd: string, subcmd: string, cmdHandler: CmdHandlerFn, args: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>) {
    this.cmdHandler = cmdHandler;
    this.cmd = cmd;
    this.subcmd = subcmd;
    this.registerHandler(args);
  }

  /**
   * Calls the `cmdHandler` function passed to the constructor with the
   * appropriate arguments.
   */
  private registerHandler = async (args: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>): Promise<void> => {
    const commandStringParts: string[] = args.command.text.split(' ');

    if (commandStringParts[0] === this.cmd && commandStringParts[1] === this.subcmd) {
      const params = commandStringParts.slice(2, commandStringParts.length);
      this.cmdHandler(args.command, args.respond, { subcmd: this.subcmd, ...params });
    }
  }

}
