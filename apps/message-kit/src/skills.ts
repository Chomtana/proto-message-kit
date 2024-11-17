import { handleBalance } from "./handler/balance.js";
import { handleEns } from "./handler/ens.js";
import type { SkillGroup } from "@xmtp/message-kit";
import { protokitHandler } from "./protokit.js";

export const skills: SkillGroup[] = [
  {
    name: 'Mina Protokit Faucet Bot',
    tag: '@protokit',
    description: 'A basic protokit-enabled faucet agent',
    skills: [
      {
        skill: "/balance [address]",
        handler: protokitHandler(handleBalance),
        description: "Query token balance of the specified address",
        examples: [
          "/balance B62qrgEkAAFxUufRcS9DNuDTV3yksHQn5MpGzM8f5CLJRNpRs27DdkS"
        ],
        params: {
          address: {
            type: "string",
          }
        },
      },
      {
        skill: "/faucet [address] [amount]",
        handler: protokitHandler(handleBalance),
        description: "Request faucet and get token send to the specified address",
        examples: [
          "/faucet B62qrgEkAAFxUufRcS9DNuDTV3yksHQn5MpGzM8f5CLJRNpRs27DdkS",
          "/faucet B62qrgEkAAFxUufRcS9DNuDTV3yksHQn5MpGzM8f5CLJRNpRs27DdkS 20"
        ],
        params: {
          address: {
            type: "string",
          },
          amount: {
            type: "number",
          },
        },
      },
    ]
  },

  {
    name: "Ens Domain Bot",
    tag: "@ens",
    description: "Register ENS domains.",
    skills: [
      {
        skill: "/register [domain]",
        handler: handleEns,
        description:
          "Register a new ENS domain. Returns a URL to complete the registration process.",
        examples: ["/register vitalik.eth"],
        params: {
          domain: {
            type: "string",
          },
        },
      },
      {
        skill: "/info [domain]",
        handler: handleEns,
        description:
          "Get detailed information about an ENS domain including owner, expiry date, and resolver.",
        examples: ["/info nick.eth"],
        params: {
          domain: {
            type: "string",
          },
        },
      },
      {
        skill: "/renew [domain]",
        handler: handleEns,
        description:
          "Extend the registration period of your ENS domain. Returns a URL to complete the renewal.",
        examples: ["/renew fabri.base.eth"],
        params: {
          domain: {
            type: "string",
          },
        },
      },
      {
        skill: "/check [domain]",
        handler: handleEns,
        examples: ["/check vitalik.eth", "/check fabri.base.eth"],
        description: "Check if a domain is available.",
        params: {
          domain: {
            type: "string",
          },
        },
      },
      {
        skill: "/cool [domain]",
        examples: ["/cool vitalik.eth"],
        handler: handleEns,
        description: "Get cool alternatives for a .eth domain.",
        params: {
          domain: {
            type: "string",
          },
        },
      },
      {
        skill: "/reset",
        examples: ["/reset"],
        handler: handleEns,
        description: "Reset the conversation.",
        params: {},
      },
      {
        skill: "/tip [address]",
        description: "Show a URL for tipping a domain owner.",
        handler: handleEns,
        examples: ["/tip 0x1234567890123456789012345678901234567890"],
        params: {
          address: {
            type: "string",
          },
        },
      },
    ],
  },
];
