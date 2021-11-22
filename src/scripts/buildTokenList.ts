import type { Network } from "@saberhq/solana-contrib";
import type { TokenInfo, TokenList } from "@saberhq/token-utils";
import axios from "axios";
import * as fs from "fs/promises";

import { createDecimalWrapperTokenIcon } from "../createDecimalWrapperTokenIcon";
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
  const lpTokenList: TokenList = {
    name: `Saber LP Token List (${network})`,
    logoURI:
      "https://raw.githubusercontent.com/saber-hq/saber-lp-token-list/master/sbr.svg",
    tags: {},
    timestamp: new Date().toISOString(),
    tokens: lpTokens.sort((a, b) => {
      return a.address < b.address ? -1 : 1;
    }),
  };
  await fs.writeFile(
    `${dir}/lists/saber-lp.${network}.json`,
    JSON.stringify(lpTokenList, null, 2)
  );

  const decimalWrappedTokens = await Promise.all(
    data.pools
      .flatMap((pool) => pool.tokens)
      .filter((tok) => tok.tags?.includes("saber-decimal-wrapped"))
      .map(async (tok) => {
        const { png, jpg } = await createDecimalWrapperTokenIcon(
          tok,
          tok.decimals
        );
        await fs.mkdir(`${assetsDir}/${tok.address}`, {
          recursive: true,
        });
        await fs.writeFile(`${assetsDir}/${tok.address}/icon.png`, png);
        await fs.writeFile(`${assetsJpgDir}/${tok.address}.jpg`, jpg);
        return {
          ...tok,
          logoURI: `https://raw.githubusercontent.com/saber-hq/saber-lp-token-list/master/assets/${networkFmt}/${tok.address}/icon.png`,
          extensions: {
            ...tok.extensions,
            website: "https://app.saber.so",
          },
        };
      })
  );
  const decimalWrapperTokenList: TokenList = {
    name: `Saber Decimal Wrapped Token List (${network})`,
    logoURI:
      "https://raw.githubusercontent.com/saber-hq/saber-lp-token-list/master/sbr.svg",
    tags: {},
    timestamp: new Date().toISOString(),
    tokens: decimalWrappedTokens.sort((a, b) => {
      return a.address < b.address ? -1 : 1;
    }),
  };
  await fs.writeFile(
    `${dir}/lists/saber-wrapped.${network}.json`,
    JSON.stringify(decimalWrapperTokenList, null, 2)
  );

  const tokensForSolanaTokenList = [...lpTokens, ...decimalWrappedTokens]
    .sort((a, b) => (a.address < b.address ? -1 : 1))
    .map((tok) => {
      const logoURI = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/${networkFmt}/${tok.address}/icon.png`;
      const theToken = {
        ...tok,
        name: tok.name.endsWith(" Saber LP")
          ? `Saber ${tok.name.replace(/ Saber LP/g, " LP")}`
          : tok.name,
        symbol: tok.symbol.replace(/_/g, ""),
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
    process.exit(1);
  }
);
