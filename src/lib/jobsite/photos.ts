/**
 * Compress camera / gallery images for on-device storage and export packs.
 * Max ~3 photos per report; each JPEG capped in pixel size and byte budget.
 */

import { newId } from "./domain";
import type { ReportPhoto } from "./types";

export const MAX_PHOTOS_PER_REPORT = 3;
const MAX_EDGE = 960;
const JPEG_QUALITY = 0.72;
const MAX_BYTES = 280_000;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/** Resize + JPEG-encode a File/Blob into a data URL suitable for localStorage packs. */
export async function compressPhotoFile(file: File | Blob): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("Photos only work in the browser");
  }
  const img = await loadImage(file);
  let { width, height } = img;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = JPEG_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_BYTES && quality > 0.35) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_BYTES * 1.4) {
    // Second pass: shrink edge further
    const shrink = 0.65;
    canvas.width = Math.max(1, Math.round(width * shrink));
    canvas.height = Math.max(1, Math.round(height * shrink));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL("image/jpeg", 0.6);
  }
  return dataUrl;
}

export async function fileToReportPhoto(file: File): Promise<ReportPhoto> {
  const dataUrl = await compressPhotoFile(file);
  return {
    id: newId("ph"),
    dataUrl,
    caption: file.name?.replace(/\.[^.]+$/, "") || undefined,
    createdAt: new Date().toISOString(),
  };
}
