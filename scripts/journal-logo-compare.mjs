import sharp from "sharp";

// Compare the clean redraw at the original mockup's pixel scale, ignoring the
// light presentation tile and shadow. No resizing/alignment search is applied.
const root = new URL("../assets/journal-icon/", import.meta.url);
const { data: reference, info } = await sharp(new URL("leo-logo-mockup.png", root).pathname)
  .flatten({ background: "#fff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const dark = (pixels, offset) => (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3 < 128;
let left = info.width, top = info.height, right = 0, bottom = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (dark(reference, (y * info.width + x) * info.channels)) {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
const width = right - left + 1, height = bottom - top + 1;
const vector = await sharp(new URL("source.svg", root).pathname)
  .resize(width, height, { fit: "fill" }).flatten({ background: "#fff" }).removeAlpha().raw().toBuffer();
let intersection = 0, union = 0, extra = 0, missing = 0;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const a = dark(reference, ((top + y) * info.width + left + x) * info.channels);
  const b = dark(vector, (y * width + x) * 3);
  if (a && b) intersection++;
  if (a || b) union++;
  if (b && !a) extra++;
  if (a && !b) missing++;
}
console.log(JSON.stringify({ threshold: "mean RGB < 128", bbox: { left, top, width, height }, intersection, union, extra, missing, iou: intersection / union }, null, 2));
