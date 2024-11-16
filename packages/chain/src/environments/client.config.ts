import { AppChainModule, AuroSigner, ClientAppChain, Signer } from "@proto-kit/sdk";
import runtime from "../runtime/index.js";
import { TypedClass } from "@proto-kit/common";

export function buildAppChain(signer: TypedClass<Signer & AppChainModule<any>>) {
  const appChain = ClientAppChain.fromRuntime(runtime.modules, signer);

  appChain.configurePartial({
    Runtime: runtime.config,
  });
  
  appChain.configurePartial({
    GraphqlClient: {
      url: process.env.NEXT_PUBLIC_PROTOKIT_GRAPHQL_URL,
    },
  });

  return appChain
}

export const client = buildAppChain(AuroSigner);