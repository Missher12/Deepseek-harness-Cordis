// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { classifyFiles, imageBatchFailure } from '../src/client/file-intake.ts'
import { SessionInputShell } from '../src/client/input/facade.ts'
import type { DraftAttachmentId, SubmitOutcome } from '../src/client/contract/input.ts'

const header = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)
const limits = { maxImageBytes: 20_000_000, maxImagesPerMessage: 9, maxMessageImageBytes: 180_000_000,
  maxImagePixels: 64_000_000, maxImageDimension: 8192, mediaTypes: ['image/png'] as const }
const image = (size = 20_000_000) => new File([header, new Uint8Array(size - header.length)], 'image.png', { type: 'image/png' })

describe('unified file intake', () => {
  it('routes blank and spoofed ordinary MIME images by signature while preserving directories and ordinary files', async () => {
    const directory = new File([], 'folder')
    const ordinary = new File(['notes'], 'notes.txt', { type: 'text/plain' })
    const files = await classifyFiles([new File([header], 'unknown'), new File([header], 'notes.txt', { type: 'text/plain' }), ordinary, directory], new Set([directory]))
    expect(files.map(file => file.type)).toEqual(['image/png', 'image/png', 'text/plain', ''])
    expect(files[2]).toBe(ordinary)
    expect(files[3]).toBe(directory)
    await expect(classifyFiles([ordinary, new File(['bad'], 'bad.png', { type: 'image/png' })], new Set()))
      .rejects.toMatchObject({ reason: 'INVALID_IMAGE' })
    await expect(classifyFiles([new File([header], 'bad.jpg', { type: 'image/jpeg' })], new Set()))
      .rejects.toMatchObject({ reason: 'IMAGE_TYPE_MISMATCH' })
  })

  it('accepts the exact byte/count boundary and rejects the entire 8+2 batch', () => {
    const good = image()
    expect(imageBatchFailure([], Array<File>(9).fill(good), limits)).toBeUndefined()
    expect(imageBatchFailure([], [image(20_000_001)], limits)).toBe('IMAGE_TOO_LARGE')
    expect(imageBatchFailure(Array<File>(8).fill(good), [good, good], limits)).toBe('TOO_MANY_IMAGES')
    expect(imageBatchFailure(Array<File>(8).fill(good), [good], limits)).toBeUndefined()
    expect(imageBatchFailure([], [good], { ...limits, maxMessageImageBytes: good.size - 1 })).toBe('IMAGES_TOO_LARGE')
  })

  it('serializes rapid batches against the live draft and holds send until intake settles', async () => {
    const sink = vi.fn(() => Promise.resolve<SubmitOutcome>({ kind: 'success' }))
    const shell = new SessionInputShell({ actx: {} as Context, defaultSink: sink,
      commandAttachments: { serialize: async () => [], release: () => {}, unsupportedNotice: () => '' } })
    shell.setDraft('keep me')
    const firstIds = Array.from({ length: 8 }, (_, index) => `image-${index}` as DraftAttachmentId)
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const first = shell.enqueueFileIntake(async () => { await gate; shell.addFiles([], firstIds); return null }, 'closed')
    const second = shell.enqueueFileIntake(async () => shell.snapshot.attachmentIds.length + 2 > 9 ? 'too many' : null, 'closed')
    shell.submit()
    expect(sink).not.toHaveBeenCalled()
    expect(shell.snapshot.intakePending).toBe(true)
    release()
    expect(await first).toBeNull()
    expect(await second).toBe('too many')
    expect(shell.snapshot.attachmentIds).toEqual(firstIds)
    expect(shell.snapshot.draft).toBe('keep me')
    expect(shell.snapshot.intakePending).toBe(false)
    expect(shell.removeAttachment(firstIds[0]!)).toBe(true)
    expect(shell.addFiles([], [firstIds[0]!])).toBe(true)
    expect(shell.snapshot.attachmentIds).toHaveLength(8)
    shell.dispose()
    expect(await shell.enqueueFileIntake(async () => null, 'closed')).toBe('closed')
    expect(shell.addFiles([], firstIds)).toBe(false)
  })
})
