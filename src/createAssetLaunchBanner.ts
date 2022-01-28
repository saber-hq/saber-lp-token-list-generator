import type { TokenInfo } from "@saberhq/token-utils";
import axios from "axios";
import type { Image } from "canvas";
import { createCanvas, loadImage, registerFont } from "canvas";
import * as fs from "fs/promises";
import Vibrant from "node-vibrant";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 628;

const DIMENSION = 256;

const drawImage = async ({
  url,
}: {
  url?: string;
}): Promise<{
  colorStart: string | null;
  colorEnd: string | null;
  image: Image | null;
}> => {
  try {
    let image: Image | null = null;
    let colorStart: string | null = null;
    let colorEnd: string | null = null;
    if (!url) {
      image = await loadImage(`${__dirname}/../public/sbr.svg`);
    } else {
      const { data: iconData } = await axios.get<Buffer>(url, {
        responseType: "arraybuffer",
      });
      // run through sharp to be save
      const rasterizedIcon = await sharp(iconData)
        .resize(DIMENSION, DIMENSION)
        .png()
        .toBuffer();
      image = await loadImage(rasterizedIcon);

      const v = new Vibrant(rasterizedIcon);
      const palette = await v.getPalette();
      colorStart = palette.Vibrant?.hex ?? palette.DarkVibrant?.hex ?? null;
      colorEnd = palette.Muted?.hex ?? palette.DarkMuted?.hex ?? null;
    }

    return { colorStart, colorEnd, image };
  } catch (e) {
    console.warn(`Unsupported image: ${url ?? ""}`, e);
  }
  return { colorStart: null, colorEnd: null, image: null };
};

export const createAssetLaunchBanner = async (
  token: TokenInfo
): Promise<{ png: Buffer; jpg: Buffer }> => {
  const launchBannerBG = await fs.readFile(`${__dirname}/launch-banner.svg`);

  registerFont(`${__dirname}/Inter-Bold.ttf`, {
    family: "Inter",
    weight: "bold",
  });
  registerFont(`${__dirname}/Inter-SemiBold.ttf`, {
    family: "Inter",
    weight: "semibold",
  });
  registerFont(`${__dirname}/Inter-Medium.ttf`, {
    family: "Inter",
    weight: "medium",
  });

  const canvas = createCanvas(WIDTH, 628);
  const ctx = canvas.getContext("2d");
  ctx.quality = "best";
  ctx.patternQuality = "best";

  const { colorStart, colorEnd, image } = await drawImage({
    url: token.logoURI,
  });

  const launchBannerStr = launchBannerBG
    .toString()
    .replaceAll("$ASSET_BORDER_COLOR_1", colorStart ?? "#000")
    .replaceAll("$ASSET_BORDER_COLOR_2", colorEnd ?? "#000");

  // run through sharp to be safe
  const rasterizedBanner = await sharp(Buffer.from(launchBannerStr, "utf-8"))
    .resize(WIDTH, HEIGHT)
    .png()
    .toBuffer();

  ctx.drawImage(
    await loadImage(rasterizedBanner),
    0,
    0,
    WIDTH,
    HEIGHT,
    0,
    0,
    WIDTH,
    HEIGHT
  );

  ctx.font = `bold 48px Inter`;
  const symbolSize = ctx.measureText(token.symbol);
  const textWidth = symbolSize.width;
  const textHeight = symbolSize.actualBoundingBoxAscent;

  const iconDim = 64;
  const totalWidth = iconDim + textWidth + 16;
  const startX = WIDTH / 2 - totalWidth / 2;
  const startY = 240;

  if (image) {
    ctx.drawImage(
      image,
      0,
      0,
      image.width,
      image.height,
      startX,
      startY,
      iconDim,
      iconDim
    );
  }

  ctx.fillStyle = "white";
  ctx.fillText(
    token.symbol,
    startX + iconDim + 16,
    startY + iconDim - textHeight / 2
  );

  ctx.font = `medium 28px Inter`;
  ctx.fillStyle = "#979EAF";
  ctx.textAlign = "center";
  ctx.fillText(token.name, WIDTH / 2, 321 + 34);

  ctx.fillStyle = "#222324";
  ctx.fillRect(WIDTH / 2 - 203 / 2, 397, 203, 1);

  ctx.font = `semibold 29px Inter`;
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("Now live on Saber", WIDTH / 2, 437 + 29);

  return {
    png: canvas.toBuffer("image/png", { compressionLevel: 9 }),
    jpg: canvas.toBuffer("image/jpeg"),
  };
};
