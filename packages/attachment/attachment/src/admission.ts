/** Wire-form admission of base64-encoded image uploads. @module @deepseek-ai/dsh-attachment/admission */

import { Buffer } from 'node:buffer'
import { AttachmentError } from './error.ts'
import { detectImageMediaType } from './image-format.ts'
import type { AttachmentStore } from './index.ts'
import type {
  EncodedFileAttachment,
  EncodedImageAttachment,
  FileAttachmentRef,
  ImageAttachmentRef,
  SaveImageAttachment,
  SaveFileStreamAttachment,
} from './types.ts'

/** Decode one upload payload while rejecting non-canonical base64 forms. */
function decodeCanonicalBase64(data: string, empty: 'reject' | 'accept', code: 'INVALID_IMAGE_BASE64' | 'INVALID_FILE_BASE64'): Uint8Array {
  const decoded = Buffer.from(data, 'base64')
  if ((data.length === 0 && empty === 'reject') || decoded.toString('base64') !== data) {
    throw new AttachmentError(
      code === 'INVALID_IMAGE_BASE64' ? 'Image upload is not canonical base64.' : 'File upload is not canonical base64.',
      code,
    )
  }
  return new Uint8Array(decoded)
}

function decodeBase64(data: string): Uint8Array {
  return decodeCanonicalBase64(data, 'reject', 'INVALID_IMAGE_BASE64')
}

/** Store input for one decoded upload. */
function saveInput(image: EncodedImageAttachment): SaveImageAttachment {
  return {
    data: decodeBase64(image.data),
    mediaType: image.mediaType,
    ...image.name === undefined ? {} : { name: image.name },
  }
}

/**
 * Admit one wire image batch: enforce canonical base64 on every member, then
 * delegate batch admission — count and aggregate-byte limits, media-type and
 * per-image validation, ordered commit — to {@link AttachmentStore.saveImages}.
 * The shared entry for every RPC endpoint accepting browser uploads.
 * @param attachments - the deployment attachment store owning batch policy.
 * @param images - base64-encoded uploads in caller order.
 * @returns durable references in the same order as `images`.
 * @throws AttachmentError on a non-canonical payload or a refused batch.
 */
export async function admitEncodedImages(
  attachments: AttachmentStore,
  images: readonly EncodedImageAttachment[],
): Promise<readonly ImageAttachmentRef[]> {
  return attachments.saveImages(images.map(saveInput))
}

/**
 * Admit one wire file upload: enforce canonical base64 (an empty file is a
 * valid zero-byte payload), reject supported image signatures, then delegate verbatim commit to
 * {@link AttachmentStore.saveFile}. The shared entry for every RPC endpoint
 * accepting browser file uploads.
 * @param attachments - the deployment attachment store.
 * @param file - base64-encoded upload and optional display name.
 * @returns the durable content-addressed file reference.
 * @throws AttachmentError on a non-canonical payload or a storage failure.
 */
export async function admitEncodedFile(
  attachments: AttachmentStore,
  file: EncodedFileAttachment,
): Promise<FileAttachmentRef> {
  const data = decodeCanonicalBase64(file.data, 'accept', 'INVALID_FILE_BASE64')
  rejectImageFile(data)
  return attachments.saveFile({
    data,
    ...file.name === undefined ? {} : { name: file.name },
  })
}

function rejectImageFile(bytes: Uint8Array): void {
  if (detectImageMediaType(bytes) !== undefined) {
    throw new AttachmentError('Images must use image admission, not a file upload.', 'IMAGE_REQUIRES_IMAGE_UPLOAD')
  }
}

/**
 * Admit a streamed ordinary file after inspecting its bounded signature prefix.
 * Raw storage remains verbatim; upload admission cannot disguise supported images as files.
 * @param attachments - the deployment attachment store.
 * @param input - ordered chunks, optional cancellation, and display name.
 * @returns the durable reference after signature validation and a successful commit.
 */
export function admitFileStream(attachments: AttachmentStore, input: SaveFileStreamAttachment): Promise<FileAttachmentRef> {
  async function* checked(): AsyncGenerator<Uint8Array> {
    const prefix = new Uint8Array(12)
    const buffered: Uint8Array[] = []
    let used = 0
    let admitted = false
    for await (const chunk of input.data) {
      input.signal?.throwIfAborted()
      if (admitted) {
        yield chunk
        continue
      }
      if (chunk.length === 0) continue
      buffered.push(chunk)
      const count = Math.min(prefix.length - used, chunk.length)
      prefix.set(chunk.subarray(0, count), used)
      used += count
      if (used < prefix.length) continue
      rejectImageFile(prefix)
      admitted = true
      yield* buffered
      buffered.length = 0
    }
    input.signal?.throwIfAborted()
    if (!admitted) {
      rejectImageFile(prefix.subarray(0, used))
      yield* buffered
    }
  }
  return attachments.saveFileStream({ ...input, data: checked() })
}
