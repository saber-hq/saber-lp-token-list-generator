import type { TokenInfo } from "@saberhq/token-utils";
import axios from "axios";
import type { CanvasRenderingContext2D, Image } from "canvas";
import { createCanvas, loadImage } from "canvas";
import sharp from "sharp";

const DIMENSION = 256;

const drawSubImg = async ({
  ctx,
  url,
  position,
}: {
  ctx: CanvasRenderingContext2D;
  url?: string;
  position: "a" | "b";
}) => {
  try {
    let image: Image | null = null;
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
    }

    ctx.drawImage(
      image,
      position === "a" ? 0 : image.width / 2,
      0,
      image.width / 2,
      image.height,
      position === "a" ? 0 : DIMENSION / 2,
      0,
      DIMENSION / 2,
      DIMENSION,
    );
  } catch (e) {
    console.warn(`Unsupported image: ${url ?? ""}`, e);
  }
};

export const createLPTokenIcon = async (
  underlying: readonly [TokenInfo, TokenInfo],
): Promise<{ png: Buffer; jpg: Buffer }> => {
  const canvas = createCanvas(DIMENSION, DIMENSION);
  const ctx = canvas.getContext("2d");
  ctx.quality = "best";
  ctx.patternQuality = "best";

  // clip the circle
  ctx.beginPath();
  ctx.arc(DIMENSION / 2, DIMENSION / 2, DIMENSION / 2, 0, 2 * Math.PI);
  ctx.clip();

  await drawSubImg({ ctx, url: underlying[0].logoURI, position: "a" });
  await drawSubImg({ ctx, url: underlying[1].logoURI, position: "b" });

  const mask = await loadImage(`${__dirname}/mask.svg`);
  ctx.drawImage(mask, 0, 0, DIMENSION, DIMENSION);

  return {
    png: canvas.toBuffer("image/png", { compressionLevel: 9 }),
    jpg: canvas.toBuffer("image/jpeg"),
  };
};
