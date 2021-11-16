import type { TokenInfo } from "@saberhq/token-utils";
import axios from "axios";
import type { Image, NodeCanvasRenderingContext2D } from "canvas";
import { createCanvas, loadImage } from "canvas";

const DIMENSION = 512;

const drawSubImg = async ({
  ctx,
  url,
  position,
}: {
  ctx: NodeCanvasRenderingContext2D;
  url?: string;
  position: "a" | "b";
}) => {
  try {
    let image: Image | null = null;
    if (!url) {
      image = await loadImage(`${__dirname}/../sbr.svg`);
    } else {
      const { data: logoAData } = await axios.get<Buffer>(url, {
        responseType: "arraybuffer",
      });
      image = await loadImage(logoAData);
    }
    ctx.drawImage(
      image,
      position === "a" ? 0 : image.width / 2,
      0,
      image.width / 2,
      image.height,
      position === "a" ? 0 : 256,
      0,
      DIMENSION / 2,
      DIMENSION
    );
  } catch (e) {
    console.warn(`Unsupported image: ${url ?? ""}`);
  }
};

export const createLPTokenIcon = async (
  underlying: readonly [TokenInfo, TokenInfo]
): Promise<Buffer> => {
  const canvas = createCanvas(DIMENSION, DIMENSION);
  const ctx = canvas.getContext("2d");
  ctx.quality = "best";

  // clip the circle
  ctx.beginPath();
  ctx.arc(DIMENSION / 2, DIMENSION / 2, DIMENSION / 2, 0, 2 * Math.PI);
  ctx.clip();

  await drawSubImg({ ctx, url: underlying[0].logoURI, position: "a" });
  await drawSubImg({ ctx, url: underlying[1].logoURI, position: "b" });

  const mask = await loadImage(`${__dirname}/mask.svg`);
  ctx.drawImage(mask, 0, 0, DIMENSION, DIMENSION);

  return canvas.toBuffer();
};
