/**
 * Resizes an image in the browser before upload: longest side ≤ maxSide, WebP.
 * Falls back to JPEG when the browser cannot encode WebP (older Safari).
 */
export async function resizeImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("Image encoding failed");
  return jpeg;
}

export function extensionFor(blob: Blob): string {
  return blob.type === "image/webp" ? "webp" : "jpg";
}
