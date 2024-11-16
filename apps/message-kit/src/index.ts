import { agentRun } from "@xmtp/message-kit";
import { agent_prompt } from "./prompt.js";
import { HandlerProtokitContext, runWithProtokit } from "./protokit.js";

runWithProtokit(async (context: HandlerProtokitContext) => {
  const {
    message: { sender },
  } = context;

  console.log(sender)

  agentRun(context, async (address: string) => {
    const result = (await agent_prompt(address)) ?? "No response available";
    return result;
  });
});
