import { SkillResponse } from "@xmtp/message-kit";
import { HandlerProtokitContext } from "../protokit";
import { Balance, BalancesKey, TokenId } from "@proto-kit/library";
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
    const { address, amount } = params;

    if (!address) {
      return {
        code: 400,
        message: "Please provide an address to check balance.",
      };
    }

    const balances = context.protokit.client.runtime.resolve("Balances");
    const tokenId = TokenId.from(0);
    
    await context.protokit.transaction(async () => {
      await balances.addBalance(tokenId, PublicKey.fromBase58(address), Balance.from(amount || 10));
    })

    await context.send(`Dripping ${amount || 10} tokens...`)

    setTimeout(() => context.executeSkill(`/balance ${address}`), 3000)

    return {
      code: 200,
      message: `Transaction executed successfully`,
    }
  } else {
    return { code: 400, message: "Skill not found." };
  }
}