import type { Network } from "@saberhq/solana-contrib";
import type { TokenInfo, TokenList } from "@saberhq/token-utils";
import axios from "axios";
import * as fs from "fs/promises";

import { createLPTokenIcon } from "../createLPTokenIcon";

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

export const buildTokenList = async (network: Network): Promise<void> => {
  const dir = `${__dirname}/../../data`;
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(`${dir}/icons`, { recursive: true });
  await fs.mkdir(`${dir}/lists/`, { recursive: true });

  const { data } = await axios.get<{ pools: PoolInfoRaw[] }>(
    `https://registry.saber.so/data/pools-info.${
      network === "mainnet-beta" ? "mainnet" : network
    }.json`
  );

  const lpTokens = await Promise.all(
    data.pools.map(async (pool) => {
      const iconBuffer = await createLPTokenIcon(pool.underlyingIcons);
      const iconDir = `${dir}/icons/${pool.lpToken.address}`;
      await fs.mkdir(iconDir, {
        recursive: true,
      });
      await fs.writeFile(`${iconDir}/icon.png`, iconBuffer);
      return pool.lpToken;
    })
  );

  const list: TokenList = {
    name: `Saber LP Token List (${network})`,
    logoURI:
      "https://raw.githubusercontent.com/saber-hq/saber-lp-token-list/master/sbr.svg",
    tags: {},
    timestamp: new Date().toISOString(),
    tokens: lpTokens,
  };

  await fs.writeFile(
    `${dir}/token-lists/saber-lp.${network}.json`,
    JSON.stringify(list)
  );
};

Promise.all([buildTokenList("mainnet-beta"), buildTokenList("devnet")]).catch(
  (err) => {
    console.error(err);
  }
);
