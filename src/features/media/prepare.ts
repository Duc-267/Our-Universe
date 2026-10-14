export const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
export const MAX_STORED_BYTES = 4_500_000;
const FULL_EDGE = 1600;
const THUMB_EDGE = 320;

export type PreparedPhoto = {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  extension: "webp" | "jpg";
};

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function resizedCanvas(source: ImageBitmap, edge: number) {
  const scale = Math.min(1, edge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare this photo.");
  context.fillStyle = "#fff6e6";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  return { canvas, width, height };
}

async function encode(canvas: HTMLCanvasElement): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  const webp = await canvasBlob(canvas, "image/webp", 0.82);
  if (webp && webp.type === "image/webp" && webp.size > 0 && webp.size <= MAX_STORED_BYTES) {
    return { blob: webp, extension: "webp" };
  }
  let quality = 0.82;
  let jpeg = await canvasBlob(canvas, "image/jpeg", quality);
  while (jpeg && jpeg.size > MAX_STORED_BYTES && quality > 0.5) {
    quality -= 0.12;
    jpeg = await canvasBlob(canvas, "image/jpeg", quality);
  }
  if (!jpeg || jpeg.size === 0 || jpeg.size > 5_000_000) {
    throw new Error("This photo is still too large after resizing.");
  }
  return { blob: jpeg, extension: "jpg" };
}

async function readableImage(file: File): Promise<File> {
  const type = file.type.toLowerCase();
  const heic = type === "image/heic" || type === "image/heif" || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
  if (heic) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      return new File([blob], "photo.jpg", { type: "image/jpeg" });
    } catch {
      throw new Error("Could not read this HEIC photo.");
    }
  }
  if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") {
    throw new Error("Use a JPEG, PNG, WebP, or HEIC photo.");
  }
  return file;
}

/** Resize one local photo into the optimized image and the thumbnail. The original is not returned. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error("Photos must be 20 MB or smaller.");
  const source = await readableImage(file);
  const bitmap = await createImageBitmap(source);
  try {
    const full = resizedCanvas(bitmap, FULL_EDGE);
    const thumb = resizedCanvas(bitmap, THUMB_EDGE);
    const encoded = await encode(full.canvas);
    const encodedThumb = await encode(thumb.canvas);
    return {
      full: encoded.blob,
      thumb: encodedThumb.blob,
      width: full.width,
      height: full.height,
      extension: encoded.extension,
    };
  } finally {
    bitmap.close();
  }
}
