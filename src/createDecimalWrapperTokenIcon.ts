import type { TokenInfo } from "@saberhq/token-utils";
import axios from "axios";
import type { Image, NodeCanvasRenderingContext2D } from "canvas";
import { createCanvas, loadImage } from "canvas";
import sharp from "sharp";

const DIMENSION = 256;

const drawImage = async ({
  ctx,
  url,
}: {
  ctx: NodeCanvasRenderingContext2D;
  url?: string;
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
      0,
      0,
      image.width,
      image.height,
      0,
      0,
      DIMENSION,
      DIMENSION
    );
  } catch (e) {
    console.warn(`Unsupported image: ${url ?? ""}`, e);
  }
};

export const createDecimalWrapperTokenIcon = async (
  token: TokenInfo,
  decimals: number
): Promise<{ png: Buffer; jpg: Buffer }> => {
  const canvas = createCanvas(DIMENSION, DIMENSION);
  const ctx = canvas.getContext("2d");
  ctx.quality = "best";
  ctx.patternQuality = "best";

  // clip the circle
  ctx.beginPath();
  ctx.arc(DIMENSION / 2, DIMENSION / 2, DIMENSION / 2, 0, 2 * Math.PI);
  ctx.clip();

  await drawImage({ ctx, url: token.logoURI });

  ctx.beginPath();
  ctx.arc(DIMENSION / 2, (DIMENSION * 7) / 8, DIMENSION / 4, 0, 2 * Math.PI);
  ctx.fillStyle = "#6764FB";
  ctx.fill();

  const fontSize = (DIMENSION / 4) * 1.1;
  ctx.font = `bold ${fontSize}px sans`;
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.fillText(
    decimals.toString(),
    DIMENSION / 2,
    (DIMENSION * 7) / 8 + fontSize * 0.1
  );

  const mask = await loadImage(`${__dirname}/mask.svg`);
  ctx.drawImage(mask, 0, 0, DIMENSION, DIMENSION);

  return {
    png: canvas.toBuffer("image/png", { compressionLevel: 9 }),
    jpg: canvas.toBuffer("image/jpeg"),
  };
};
