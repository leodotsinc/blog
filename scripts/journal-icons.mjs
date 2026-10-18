import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const png = new URL("assets/journal-icon/source.png", root);
const source = existsSync(png) ? png : new URL("assets/journal-icon/source.svg", root);
const output = new URL("public/journal-app/", root);
const bytes = await readFile(source);
const isSVG = source.pathname.endsWith(".svg");
const white = "#ffffff";
// SVG is the vector master; an optional PNG must contain only the glyph on
// transparent/white, never the presentation mockup, rounded tile or its shadow.
// Trim whitespace consistently before sizing, preserving the glyph's aspect ratio.
const glyph = await sharp(bytes, isSVG ? { density: 300 } : {})
  .flatten({ background: white }).trim({ background: white, threshold: 10 })
  .png().toBuffer();
const { width, height } = await sharp(glyph).metadata();
if (!width || !height) throw new Error("Journal source must contain a visible glyph.");
await mkdir(output, { recursive: true });

async function icon(name, size, fraction, maskable = false) {
  // Width is normally 70%. For arbitrary tall replacement artwork, also cap its
  // height. The maskable diagonal fits inside the central safe circle (r=40%).
  let scale = size * fraction / Math.max(width, height);
  if (maskable) scale = Math.min(scale, size * 0.79 / Math.hypot(width, height));
  const mark = await sharp(glyph).resize(Math.round(width * scale), Math.round(height * scale)).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: white } })
    .composite([{ input: mark, gravity: "centre" }])
    .flatten({ background: white }).removeAlpha().png()
    .toFile(fileURLToPath(new URL(name, output)));
}

await icon("icon-192.png", 192, 0.7);
await icon("icon-512.png", 512, 0.7);
await icon("icon-maskable-512.png", 512, 0.6, true);
await icon("apple-touch-icon.png", 180, 0.7);
await icon("favicon-32.png", 32, 0.88);

// Keep the favicon vector and transparent. A PNG override uses a self-contained
// SVG wrapper around the trimmed glyph, without preserving the old artwork.
const favicon = isSVG ? bytes : Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="data:image/png;base64,${glyph.toString("base64")}"/></svg>\n`,
);
await writeFile(new URL("favicon.svg", output), favicon);
console.log(`Journal icons generated from ${fileURLToPath(source)} in ${fileURLToPath(output)}`);
