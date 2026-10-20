"use client";

import { IMAGE_LIMITS } from "@/lib/ai/analysis-schema";

export type ImageProblem = "imageInvalid" | "imageTooLarge" | "imageUnreadable";

/** Fast checks before any decoding. The server re-validates the real bytes. */
export function checkImageFile(file: File): ImageProblem | null {
  if (!(IMAGE_LIMITS.acceptedTypes as readonly string[]).includes(file.type)) return "imageInvalid";
  if (file.size > IMAGE_LIMITS.maxOriginalBytes) return "imageTooLarge";
  return null;
}

/**
 * Downscales to at most 1600px and re-encodes as JPEG so uploads stay small (fast on mobile
 * data, and under the hosting request-size limit) while keeping enough detail for diagnosis.
 */
export async function prepareImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("imageUnreadable");
  }
  const scale = Math.min(1, IMAGE_LIMITS.maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("imageUnreadable");
  context.fillStyle = "#ffffff"; // flatten PNG transparency
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("imageUnreadable");
  if (blob.size > IMAGE_LIMITS.maxUploadBytes) throw new Error("imageTooLarge");
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("imageUnreadable"));
    reader.readAsDataURL(file);
  });
}
