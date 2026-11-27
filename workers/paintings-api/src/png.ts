import { HttpError } from "./types";

export const MAX_BATCH_ITEMS = 10;
export const MAX_PNG_BYTES = 2 * 1024 * 1024;
export const MAX_BATCH_BYTES = 8 * 1024 * 1024;
export const MAX_BLOCKS = 4;
export const BASE_PX_PER_BLOCK = 16;
export const MAX_PIXEL_DIM = 512;
export const ALLOWED_SCALES = new Set<number>([1, 2, 4, 8]);

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Decode a strict base64 string into binary bytes while rejecting non-base64 payloads.
 */
export function decodeBase64Strict(raw: string): Uint8Array {
  const cleaned = String(raw || "").replace(/\s+/g, "");
  if (!cleaned || cleaned.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    throw new HttpError(400, "Invalid base64 PNG payload.");
  }

  // Estimate decoded length before allocating large buffers
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  const approxLen = (cleaned.length / 4) * 3 - padding;
  if (approxLen <= 0 || approxLen > MAX_PNG_BYTES) {
    throw new HttpError(400, `PNG exceeds ${MAX_PNG_BYTES / (1024 * 1024)} MB limit.`);
  }

  let binary: string;
  try {
    binary = atob(cleaned);
  } catch {
    throw new HttpError(400, "Invalid base64 PNG payload.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Validate PNG signature, IHDR header, and exact pixel dimensions for (width x height @ scale).
 */
export function validatePngDimensions(
  bytes: Uint8Array,
  blocksW: number,
  blocksH: number,
  scale: number,
): { pixelWidth: number; pixelHeight: number } {
  if (!Number.isInteger(blocksW) || blocksW < 1 || blocksW > MAX_BLOCKS) {
    throw new HttpError(400, `Width must be between 1 and ${MAX_BLOCKS} blocks.`);
  }
  if (!Number.isInteger(blocksH) || blocksH < 1 || blocksH > MAX_BLOCKS) {
    throw new HttpError(400, `Height must be between 1 and ${MAX_BLOCKS} blocks.`);
  }
  if (!Number.isInteger(scale) || !ALLOWED_SCALES.has(scale)) {
    throw new HttpError(400, "Scale must be 1, 2, 4, or 8.");
  }
  if (bytes.length > MAX_PNG_BYTES) {
    throw new HttpError(400, `PNG exceeds ${MAX_PNG_BYTES / (1024 * 1024)} MB limit.`);
  }
  if (bytes.length < 33) {
    throw new HttpError(400, "Uploaded file is not a valid PNG image.");
  }

  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new HttpError(400, "Uploaded file is not a valid PNG image.");
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ihdrLen = view.getUint32(8, false);
  const ihdrTag = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (ihdrLen !== 13 || ihdrTag !== "IHDR") {
    throw new HttpError(400, "PNG image is missing a valid IHDR header.");
  }

  const pixelWidth = view.getUint32(16, false);
  const pixelHeight = view.getUint32(20, false);
  const expectedWidth = blocksW * BASE_PX_PER_BLOCK * scale;
  const expectedHeight = blocksH * BASE_PX_PER_BLOCK * scale;

  if (pixelWidth > MAX_PIXEL_DIM || pixelHeight > MAX_PIXEL_DIM) {
    throw new HttpError(400, `PNG dimensions exceed ${MAX_PIXEL_DIM}x${MAX_PIXEL_DIM} px.`);
  }
  if (pixelWidth !== expectedWidth || pixelHeight !== expectedHeight) {
    throw new HttpError(
      400,
      `PNG dimensions (${pixelWidth}x${pixelHeight}) do not match expected ${expectedWidth}x${expectedHeight} px.`,
    );
  }

  return { pixelWidth, pixelHeight };
}
