/** Shared chooser, paste, and drop admission before any draft or upload is allocated. */
import { detectImageMediaType } from '@deepseek-ai/dsh-attachment/image-format'
import type { ImageAttachmentLimits } from '@deepseek-ai/dsh-attachment/types'

/** Stable client refusal mapped through the conversation dictionary. */
export class FileIntakeError extends Error {
  constructor(readonly reason: 'INVALID_IMAGE' | 'IMAGE_TYPE_MISMATCH') {
    super(reason)
    this.name = 'FileIntakeError'
  }
}

/** Read a bounded prefix using the browser API also available in embedded WebViews. */
function prefix(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => { resolve(new Uint8Array(reader.result as ArrayBuffer)) }
    reader.onerror = () => { reject(reader.error ?? new FileIntakeError('INVALID_IMAGE')) }
    reader.onabort = () => { reject(new FileIntakeError('INVALID_IMAGE')) }
    reader.readAsArrayBuffer(file.slice(0, 12))
  })
}

/**
 * Route supported images by bytes, preserving ordinary files and directory identities.
 * @param files - original browser or desktop inputs.
 * @param directories - directory handles marked by the drop provider.
 * @returns the whole normalized batch; failures create no draft or upload.
 */
export async function classifyFiles(files: readonly File[], directories: ReadonlySet<File>): Promise<File[]> {
  return Promise.all(files.map(async (file) => {
    if (directories.has(file)) return file
    const actual = detectImageMediaType(await prefix(file))
    if (file.type.startsWith('image/') && actual === undefined) throw new FileIntakeError('INVALID_IMAGE')
    if (actual === undefined) return file
    if (file.type.startsWith('image/') && file.type !== actual) throw new FileIntakeError('IMAGE_TYPE_MISMATCH')
    return actual === file.type ? file : new File([file], file.name, { type: actual, lastModified: file.lastModified })
  }))
}

/**
 * Check the complete image selection against the current Host projection.
 * @param existing - images already in this session's draft.
 * @param incoming - newly classified images.
 * @param limits - current deployment image limits.
 * @returns a localized-copy reason, or undefined when accepted.
 */
export function imageBatchFailure(
  existing: readonly File[], incoming: readonly File[], limits: ImageAttachmentLimits | undefined,
): 'TOO_MANY_IMAGES' | 'IMAGE_TOO_LARGE' | 'IMAGES_TOO_LARGE' | 'INVALID_IMAGE' | undefined {
  if (limits === undefined) return undefined
  if (existing.length + incoming.length > limits.maxImagesPerMessage) return 'TOO_MANY_IMAGES'
  if (incoming.some(file => file.size > limits.maxImageBytes)) return 'IMAGE_TOO_LARGE'
  if (incoming.some(file => !limits.mediaTypes.some(type => type === file.type))) return 'INVALID_IMAGE'
  if ([...existing, ...incoming].reduce((sum, file) => sum + file.size, 0) > limits.maxMessageImageBytes) return 'IMAGES_TOO_LARGE'
  return undefined
}
