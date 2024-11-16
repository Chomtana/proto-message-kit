import { SkillResponse } from "@xmtp/message-kit";
import { HandlerProtokitContext } from "../protokit";
import { BalancesKey, TokenId } from "@proto-kit/library";
import { PublicKey } from "o1js";

export async function handleBalance(
  context: HandlerProtokitContext,
): Promise<SkillResponse | undefined> {
  const {
    message: {
      sender,
      content: { skill, params },
    },
  } = context;

  console.log(skill, params)

  if (skill == "balance") {
    const { address } = params;

    if (!address) {
      return {
        code: 400,
        message: "Please provide an address to check balance.",
      };
    }

    const tokenId = TokenId.from(0);
    const key = BalancesKey.from(tokenId, PublicKey.fromBase58(address));
    const balance = await context.protokit.client.query.runtime.Balances.balances.get(key);

    await context.send(`Balance: ${balance || 0}`)

    return {
      code: 200,
      message: `Balance: ${balance || 0}`,
    };
  } else if (skill == "faucet") {
    const { address } = params;

    if (!address) {
      return {
        code: 400,
        message: "Please provide an address to check balance.",
      };
    }

    const tokenId = TokenId.from(0);
    const key = BalancesKey.from(tokenId, PublicKey.fromBase58(address));
    const balance = await context.protokit.client.query.runtime.Balances.balances.get(key);

    await context.send(`Balance: ${balance || 0}`)

    return {
      code: 200,
      message: `Balance: ${balance || 0}`,
    }
  } else {
    return { code: 400, message: "Skill not found." };
  }
}