/**
 * Compress field photos for device-local storage (IndexedDB/localStorage-friendly).
 * Max edge ~1280px, JPEG ~0.72 — enough for inspector packs without blowing quota.
 */

export const MAX_PHOTOS_PER_PROJECT = 40;
export const MAX_ATTACH_PER_REPORT = 4;

export async function fileToCompressedDataUrl(
  file: File,
  opts?: { maxEdge?: number; quality?: number },
): Promise<{ dataUrl: string; width: number; height: number; bytesApprox: number }> {
  const maxEdge = opts?.maxEdge ?? 1280;
  const quality = opts?.quality ?? 0.72;

  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const bytesApprox = Math.round((dataUrl.length * 3) / 4);
    return { dataUrl, width, height, bytesApprox };
  } finally {
    bitmap.close();
  }
}

export function sourceFromInput(
  captureAttr: string | null | undefined,
): "camera" | "library" {
  return captureAttr === "environment" || captureAttr === "user"
    ? "camera"
    : "library";
}
