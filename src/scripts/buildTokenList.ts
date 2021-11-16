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
  const networkFmt = network === "mainnet-beta" ? "mainnet" : network;
  const { data } = await axios.get<{ pools: PoolInfoRaw[] }>(
    `https://registry.saber.so/data/pools-info.${networkFmt}.json`
  );

  const dir = `${__dirname}/../../data`;
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(`${dir}/solana-token-list`, { recursive: true });

  const assetsDir = `${dir}/assets/${networkFmt}`;
  const assetsJpgDir = `${dir}/assets-jpg/${networkFmt}`;
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(assetsJpgDir, { recursive: true });
  await fs.mkdir(`${dir}/lists/`, { recursive: true });

  const lpTokens = await Promise.all(
    data.pools.map(async (pool) => {
      const { png, jpg } = await createLPTokenIcon(pool.underlyingIcons);
      await fs.mkdir(`${assetsDir}/${pool.lpToken.address}`, {
        recursive: true,
      });
      await fs.writeFile(`${assetsDir}/${pool.lpToken.address}/icon.png`, png);
      await fs.writeFile(`${assetsJpgDir}/${pool.lpToken.address}.jpg`, jpg);
      return {
        ...pool.lpToken,
        logoURI: `https://raw.githubusercontent.com/saber-hq/saber-lp-token-list/master/assets/${networkFmt}/${pool.lpToken.address}/icon.png`,
      };
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
    `${dir}/lists/saber-lp.${network}.json`,
    JSON.stringify(list)
  );

  const tokensForSolanaTokenList = list.tokens.map((tok) => {
    const logoURI = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/${networkFmt}/${tok.address}/icon.png`;
    const theToken = {
      ...tok,
      symbol: tok.symbol.replaceAll("_", ""),
      logoURI,
    };
    if (tok.extensions) {
      const {
        underlyingTokens: _underlyingTokens,
        source: _source,
        currency: _currency,
        ...extensions
      } = tok.extensions;
      return { ...theToken, extensions };
    }
    return theToken;
  });

  await fs.writeFile(
    `${dir}/solana-token-list/tokens.${network}.json`,
    JSON.stringify(tokensForSolanaTokenList, null, 2)
  );
};

Promise.all([buildTokenList("mainnet-beta"), buildTokenList("devnet")]).catch(
  (err) => {
    console.error(err);
  }
);
