/** Browser-safe image signature routing; full decoding remains the Host admission authority. */
import type { ImageMediaType } from './types.ts'

/**
 * Recognize supported raster signatures without trusting a name or declared MIME type.
 * A signature routes bytes to image validation; it does not prove that they decode.
 * @param bytes - the first twelve bytes (or the whole shorter input).
 * @returns the detected supported media type, or undefined for other data.
 */
export function detectImageMediaType(bytes: Uint8Array): ImageMediaType | undefined {
  const matches = (signature: readonly number[], offset = 0): boolean =>
    signature.every((byte, index) => bytes[offset + index] === byte)
  if (matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (matches([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (matches([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || matches([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return 'image/gif'
  if (matches([0x52, 0x49, 0x46, 0x46]) && matches([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return undefined
}
