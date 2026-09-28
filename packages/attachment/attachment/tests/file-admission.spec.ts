import { describe, expect, it, vi } from 'vitest'
import AttachmentStore from '../src/index.ts'
import { detectImageMediaType } from '../src/image-format.ts'
import type { FileAttachmentRef, SaveFileStreamAttachment } from '../src/types.ts'

const signatures = [
  ['image/png', [137, 80, 78, 71, 13, 10, 26, 10]],
  ['image/jpeg', [255, 216, 255]],
  ['image/gif', [71, 73, 70, 56, 57, 97]],
  ['image/gif', [71, 73, 70, 56, 55, 97]],
  ['image/webp', [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
] as const

describe('ordinary upload admission', () => {
  it('recognizes supported bytes independently of names and refuses base64 image uploads', async () => {
    const saveFile = vi.fn()
    const store = Object.setPrototypeOf({ saveFile }, AttachmentStore.prototype) as AttachmentStore
    for (const [mime, bytes] of signatures) {
      expect(detectImageMediaType(Uint8Array.from(bytes))).toBe(mime)
      await expect(store.admitEncodedFile({ data: Buffer.from(bytes).toString('base64'), name: 'notes.txt' }))
        .rejects.toMatchObject({ code: 'IMAGE_REQUIRES_IMAGE_UPLOAD' })
    }
    expect(saveFile).not.toHaveBeenCalled()
    expect(detectImageMediaType(new Uint8Array())).toBeUndefined()
    expect(detectImageMediaType(new TextEncoder().encode('plain text'))).toBeUndefined()
  })

  it('rejects split signatures, closes the stream, and preserves other chunks byte for byte', async () => {
    const received: number[] = []
    const store = Object.setPrototypeOf({
      async saveFileStream(input: SaveFileStreamAttachment): Promise<FileAttachmentRef> {
        for await (const chunk of input.data) received.push(...chunk)
        return { attachmentId: 'file-test' as FileAttachmentRef['attachmentId'], bytes: received.length, name: input.name ?? 'file' }
      },
    }, AttachmentStore.prototype) as AttachmentStore
    for (const [, bytes] of signatures) {
      let closed = false
      async function* chunks() { try { for (const byte of bytes) yield Uint8Array.of(byte) } finally { closed = true } }
      await expect(store.admitFileStream({ data: chunks(), name: 'pretend.bin' }))
        .rejects.toMatchObject({ code: 'IMAGE_REQUIRES_IMAGE_UPLOAD' })
      expect(closed).toBe(true)
      expect(received).toEqual([])
    }
    async function* ordinary() { yield new Uint8Array(); yield Uint8Array.of(1); yield new Uint8Array(30).fill(2) }
    await expect(store.admitFileStream({ data: ordinary() })).resolves.toMatchObject({ bytes: 31 })
    expect(received).toEqual([1, ...Array<number>(30).fill(2)])
    const controller = new AbortController()
    controller.abort(new Error('cancel upload'))
    await expect(store.admitFileStream({ data: ordinary(), signal: controller.signal })).rejects.toThrow('cancel upload')
  })
})
