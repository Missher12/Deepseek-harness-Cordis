import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SESSION_FORMAT_VERSION, SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '../src/index.ts'
import { generationLogFilename, sessionDir } from '../src/format.ts'
import { meta, oneTurnLog } from '../../session-persistence/tests/contract.ts'

const directories: string[] = []
const contexts: Context[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true })
})

describe.each(['none', 'zstd'] as const)('delete %s history', (compression) => {
  async function boot(root?: string) {
    root ??= await mkdtemp(join(tmpdir(), 'dsh-delete-'))
    if (!directories.includes(root)) directories.push(root)
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(JsonlSessionPersistence, { root, compression })
    return { persistence: ctx.sessionPersistence, root }
  }

  it('removes all generations and retains workspace files and lock identity across restart', async () => {
    const { persistence, root } = await boot()
    const id = SessionId('delete-fixture')
    const header = meta(id, root)
    const handle = await persistence.create(header)
    await handle.append(oneTurnLog())
    await handle.close()
    const dir = sessionDir(root, header.cwd, id)
    await writeFile(join(root, 'keep.txt'), 'workspace-owned')
    await writeFile(join(dir, generationLogFilename(SESSION_FORMAT_VERSION - 1, compression)), 'superseded generation')
    const before = await readdir(dir)
    expect(await persistence.delete(id)).toBe(true)
    expect(await persistence.stat(id)).toBeUndefined()
    expect(await persistence.list()).toEqual([])
    expect(await persistence.delete(id)).toBe(false)
    const remaining = await readdir(dir)
    expect(remaining).toEqual(before.filter(name => name.includes('lock')))
    expect(await readFile(join(root, 'keep.txt'), 'utf8')).toBe('workspace-owned')
    const again = await boot(root)
    expect(await again.persistence.stat(id)).toBeUndefined()
    await expect(again.persistence.open(id, 'read')).rejects.toThrow('not found')
  })

  it('refuses a writer in either backend instance and does not destroy its log', async () => {
    const first = await boot()
    const id = SessionId('busy-fixture')
    const writer = await first.persistence.create(meta(id))
    await writer.append(oneTurnLog())
    await writer.flush()
    const second = await boot(first.root)
    await expect(first.persistence.delete(id)).rejects.toThrow(/owned/)
    await expect(second.persistence.delete(id)).rejects.toThrow(/owned/)
    expect((await second.persistence.stat(id))?.header.id).toBe(id)
    await writer.close()
    expect(await second.persistence.delete(id)).toBe(true)
  })
})
