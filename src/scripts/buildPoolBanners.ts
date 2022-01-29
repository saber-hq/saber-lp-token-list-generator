import type { Network } from "@saberhq/solana-contrib";
import type { TokenInfo } from "@saberhq/token-utils";
import axios from "axios";
import * as fs from "fs/promises";

import { createPoolLaunchBanner } from "../createPoolLaunchBanner";

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

export const buildPoolBanners = async (network: Network): Promise<void> => {
  const networkFmt = network === "mainnet-beta" ? "mainnet" : network;
  const { data } = await axios.get<{ pools: PoolInfoRaw[] }>(
    `https://raw.githubusercontent.com/saber-hq/saber-registry-dist/master/data/pools-info.${networkFmt}.json`
  );

  const dir = `${__dirname}/../../data`;
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(`${dir}/solana-token-list`, { recursive: true });

  const bannersDir = `${dir}/banners-pools/${networkFmt}`;
  await fs.mkdir(bannersDir, { recursive: true });
  await fs.mkdir(`${dir}/lists/`, { recursive: true });

  await Promise.all(
    data.pools.map(async (pool) => {
      const { jpg, png } = await createPoolLaunchBanner(pool.underlyingIcons);
      await fs.writeFile(`${bannersDir}/${pool.id}.jpg`, jpg);
      await fs.writeFile(`${bannersDir}/${pool.id}.png`, png);
    })
  );
};

Promise.all([
  buildPoolBanners("mainnet-beta"),
  buildPoolBanners("devnet"),
]).catch((err) => {
  console.error(err);
  process.exit(1);
});
