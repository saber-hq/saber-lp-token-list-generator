import type { Network } from "@saberhq/solana-contrib";
import type { TokenInfo, TokenList } from "@saberhq/token-utils";
import * as fs from "fs/promises";

export interface PoolInfoRaw {
  id: string;
  name: string;

  tokens: readonly [TokenInfo, TokenInfo];
  tokenIcons: readonly [TokenInfo, TokenInfo];
  underlyingIcons: readonly [TokenInfo, TokenInfo];

  currency: string;
  lpToken: TokenInfo;
  hidden?: boolean;
  newPoolID?: string;
}

export const updateSolanaTokenList = async (
  network: Network
): Promise<void> => {
  const { version, ...existing } = JSON.parse(
    (
      await fs.readFile(
        `${__dirname}/../../../token-list/src/tokens/solana.tokenlist.json`
      )
    ).toString()
  ) as TokenList & {
    version: {
      major: number;
      minor: number;
      patch: number;
    };
  };
  const myTokens = JSON.parse(
    (
      await fs.readFile(
        `${__dirname}/../../data/solana-token-list/tokens.${network}.json`
      )
    ).toString()
  ) as TokenInfo[];

  const newTokens = myTokens.filter(
    (tok) => !existing.tokens.find((t) => t.address === tok.address)
  );

  const [firstToken, ...restOfTokens] = existing.tokens;
  const nextTokens = [firstToken, ...newTokens, ...restOfTokens];

  await fs.writeFile(
    `${__dirname}/../../../token-list/src/tokens/solana.tokenlist.json`,
    JSON.stringify(
      {
        ...existing,
        tokens: nextTokens,
        version,
      },
      null,
      2
    ).replaceAll("&", "\\u0026")
  );
};

Promise.all([updateSolanaTokenList("mainnet-beta")]).catch((err) => {
  console.error(err);
  process.exit(1);
});
