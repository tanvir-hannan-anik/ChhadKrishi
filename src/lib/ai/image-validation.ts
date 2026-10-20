import "server-only";

import { IMAGE_LIMITS } from "./analysis-schema";

export type ImageCheck = { ok: true; bytes: Uint8Array; mediaType: string } | { ok: false; code: "INVALID_IMAGE" | "IMAGE_TOO_LARGE" };

/** Identifies the real format from the file's magic bytes rather than trusting the declared type. */
function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export function checkImageBytes(bytes: Uint8Array): ImageCheck {
  if (bytes.byteLength > IMAGE_LIMITS.maxUploadBytes) return { ok: false, code: "IMAGE_TOO_LARGE" };
  const mediaType = sniffImageType(bytes);
  if (!mediaType) return { ok: false, code: "INVALID_IMAGE" };
  return { ok: true, bytes, mediaType };
}

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/**
 * Chat image parts must be inline base64 data URLs. Remote URLs are rejected so the server
 * (or the model provider) can never be made to fetch arbitrary addresses.
 */
export function checkImageDataUrl(url: string): ImageCheck {
  // Base64 inflates by 4/3; reject oversized payloads before decoding.
  if (url.length > Math.ceil((IMAGE_LIMITS.maxUploadBytes * 4) / 3) + 64) return { ok: false, code: "IMAGE_TOO_LARGE" };
  const match = DATA_URL.exec(url);
  if (!match) return { ok: false, code: "INVALID_IMAGE" };
  return checkImageBytes(new Uint8Array(Buffer.from(match[2], "base64")));
}
