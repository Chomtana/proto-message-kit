import { Config, Handler, HandlerContext } from "@xmtp/message-kit";
import { run } from "@xmtp/message-kit";
import { client, buildAppChain } from "chain";
import Database, { Database as DatabaseType } from "better-sqlite3";
import { PrivateKey, PublicKey } from "o1js";
import { AppChainTransaction, InMemorySigner } from "@proto-kit/sdk";
import { Balance } from "@proto-kit/library";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ComputedTransactionJSON {
  argsFields: string[];
  argsJSON: string[];
  methodId: string;
  nonce: string;
  sender: string;
  signature: {
    r: string;
    s: string;
  };
}

export interface ComputedBlockJSON {
  txs?: {
    status: boolean;
    statusMessage?: string;
    tx: ComputedTransactionJSON;
  }[];
}

export interface ChainState {
  block?: {
    height: string;
  } & ComputedBlockJSON;
}

export interface BlockQueryResponse {
  data: {
    network: {
      unproven?: {
        block: {
          height: string;
        };
      };
    };
    block: ComputedBlockJSON;
  };
}

// Database implementation
class WalletDB {
  db: DatabaseType | null = null;
  clients: { [ethAddress: string]: typeof client } = {};

  constructor() {
    this.db = new Database("./wallets.db");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wallet_keys (
        eth_address TEXT PRIMARY KEY,
        mina_private_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  insertKeyPair(ethAddress: string, minaPrivateKey: PrivateKey): void {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(
      "INSERT INTO wallet_keys (eth_address, mina_private_key) VALUES (?, ?)"
    );
    stmt.run(ethAddress.toLowerCase(), minaPrivateKey.toBase58());
  }

  getMinaKey(ethAddress: string): PrivateKey | null {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare<string, { mina_private_key: string }>(
      "SELECT mina_private_key FROM wallet_keys WHERE eth_address = ?"
    );
    const row = stmt.get(ethAddress.toLowerCase());

    return row ? PrivateKey.fromBase58(row.mina_private_key) : null;
  }

  getOrCreateMinaKey(ethAddress: string): PrivateKey {
    const pkSaved = this.getMinaKey(ethAddress);
    if (pkSaved) return pkSaved;

    const pk = PrivateKey.random();
    this.insertKeyPair(ethAddress, pk);

    return pk;
  }

  async getClient(ethAddress: string): Promise<typeof client> {
    const pk = this.getOrCreateMinaKey(ethAddress);
    const client = buildAppChain(InMemorySigner);
    await client.start();
    client.resolveOrFail("Signer", InMemorySigner).config.signer = pk;
    return client;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

async function loadBlock() {
  try {
    const graphql = process.env.NEXT_PUBLIC_PROTOKIT_GRAPHQL_URL;
    if (graphql === undefined) {
      throw new Error(
        "Environment variable NEXT_PUBLIC_PROTOKIT_GRAPHQL_URL not set, can't execute graphql requests"
      );
    }

    const response = await fetch(graphql, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query GetBlock {
            block {
              txs {
                tx {
                  argsFields
                  auxiliaryData
                  methodId
                  nonce
                  sender
                  signature {
                    r
                    s
                  }
                }
                status
                statusMessage
              }
            }
            network {
              unproven {
                block {
                  height
                }
              }
            }
          }
        `,
      }),
    });

    const { data } = (await response.json()) as BlockQueryResponse;

    return data.network.unproven
      ? {
          height: data.network.unproven.block.height,
          ...data.block,
        }
      : undefined;
  } catch (err) {
    return undefined;
  }
}

export interface PublicProtokitContext {
  chain: ChainState;
  publicClient: typeof client;
  getAppKey: (ethAddress: string) => PrivateKey;
  getClient: (ethAddress: string) => Promise<typeof client>;
}

export interface PrivateProtokitContext {
  appKey: PrivateKey;
  client: typeof client;
  transaction: (
    callback: (sender: PublicKey) => Promise<void>
  ) => Promise<AppChainTransaction>;
}

export interface ProtokitContext
  extends PublicProtokitContext,
    PrivateProtokitContext {}

export interface HandlerProtokitContext extends HandlerContext {
  protokit: ProtokitContext;
}

let publicProtokitContext: PublicProtokitContext;

export const tickInterval = 1000;

export type HandlerProtokit<T = void> = (
  context: HandlerProtokitContext
) => Promise<T>;

export async function protokitContext(
  context: HandlerContext
): Promise<HandlerProtokitContext> {
  const protokitContext: HandlerProtokitContext =
    context as HandlerProtokitContext;

  const ethAddress = context.message.sender.address;

  const appKey = await publicProtokitContext.getAppKey(ethAddress);
  const client = await publicProtokitContext.getClient(ethAddress);

  protokitContext.protokit = {
    ...publicProtokitContext,
    appKey,
    client,
    async transaction(callback) {
      const sender = appKey.toPublicKey();

      const tx = await client.transaction(sender, async () => {
        await callback(sender);
      });

      await tx.sign();
      await tx.send();

      return tx;
    },
  };

  return protokitContext;
}

export function protokitHandler<T = void>(
  handler: HandlerProtokit<T>
): (context: HandlerContext) => Promise<T> {
  return async (context: HandlerContext) => {
    return await handler(await protokitContext(context));
  };
}

export async function runWithProtokit(
  handler: HandlerProtokit,
  config?: Config
) {
  // Build public client with random private key
  const pk = PrivateKey.random();
  const client = buildAppChain(InMemorySigner);
  await client.start();
  client.resolveOrFail("Signer", InMemorySigner).config.signer = pk;

  const walletDB = new WalletDB();

  // Chain state polling
  const chain: ChainState = {
    block: await loadBlock(),
  };

  setInterval(async () => {
    chain.block = await loadBlock();
    console.debug("Height:", chain.block?.height);
  }, tickInterval);

  publicProtokitContext = {
    chain,
    publicClient: client,
    getAppKey(ethAddress: string) {
      return walletDB.getOrCreateMinaKey(ethAddress);
    },
    async getClient(ethAddress: string) {
      return walletDB.getClient(ethAddress);
    },
  };

  // Wait until chain connected before starting the agent
  while (!chain.block) {
    await wait(200);
  }

  run(protokitHandler(handler), config);
}
