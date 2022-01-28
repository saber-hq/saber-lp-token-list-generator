import type { Network } from "@saberhq/solana-contrib";
import type { TokenInfo } from "@saberhq/token-utils";
import axios from "axios";
import * as fs from "fs/promises";
import { groupBy, mapValues } from "lodash";

import { createAssetLaunchBanner } from "../createAssetLaunchBanner";

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

export const buildLaunchBanners = async (network: Network): Promise<void> => {
  const networkFmt = network === "mainnet-beta" ? "mainnet" : network;
  const { data } = await axios.get<{ pools: PoolInfoRaw[] }>(
    `https://registry.saber.so/data/pools-info.${networkFmt}.json`
  );

  const dir = `${__dirname}/../../data`;
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(`${dir}/solana-token-list`, { recursive: true });

  const bannersDir = `${dir}/banners/${networkFmt}`;
  await fs.mkdir(bannersDir, { recursive: true });
  await fs.mkdir(`${dir}/lists/`, { recursive: true });

  const tokens = Object.values(
    mapValues(
      groupBy(
        data.pools.flatMap((pool) => pool.underlyingIcons),
        (token) => token.address
      ),
      (v) => v[0]
    )
  ).filter((x): x is TokenInfo => !!x);

  await Promise.all(
    tokens.map(async (token) => {
      const { jpg } = await createAssetLaunchBanner(token);
      await fs.writeFile(`${bannersDir}/${token.address}.jpg`, jpg);
    })
  );
};

Promise.all([
  buildLaunchBanners("mainnet-beta"),
  buildLaunchBanners("devnet"),
]).catch((err) => {
  console.error(err);
  process.exit(1);
});
