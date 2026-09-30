import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { RemoteError, TestSessions } from '@deepseek-ai/dsh-client-test-runtime'
import { pluginInstanceId, formatPluginReferenceMention, parsePluginReferenceText } from '@deepseek-ai/dsh-host-plugin-inventory/reference'
import type { PluginCapabilityCandidate } from '@deepseek-ai/dsh-host-plugin-inventory/types'
import type { PluginEntryId } from '@deepseek-ai/dsh-host-plugin-inventory/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { InputTriggerController } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { InsertReferenceRequest, InputTriggerPick } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { pluginReferenceSource } from '../src/client/plugin-source.ts'

const sid = (id: string) => id as SessionId
const candidate = (entry: string): PluginCapabilityCandidate => {
  const id = pluginInstanceId(JSON.stringify(['test-plugin', entry, 'host']))
  return { id, label: '中文 @ 插件', description: 'tools', moduleName: 'test-plugin', entryId: entry as PluginEntryId,
    capabilities: [], capabilityCount: 0, mention: formatPluginReferenceMention(id) }
}

async function bench() {
  const ctx = new Context()
  const listeners = new Map<string, Set<() => void>>()
  class Remote extends Service {
    constructor() { super(ctx, 'remote') }
    $on(event: string, listener: () => void) {
      const set = listeners.get(event) ?? new Set<() => void>()
      listeners.set(event, set); set.add(listener)
      return () => { set.delete(listener) }
    }
  }
  new Remote()
  const lookup = vi.fn<(sessionId: SessionId, query: string, signal?: AbortSignal) => Promise<RemoteResult<PluginCapabilityCandidate[]>>>(async () => ({ ok: true, value: [candidate('first'), candidate('second')] }))
  ctx.provide('remote.pluginInventory', { candidates: lookup })
  const sessions = new TestSessions(async (action) => { await action() }, ctx)
  await sessions.add({ id: sid('a') }); await sessions.add({ id: sid('b') })
  const a = sessions.retainFor(ctx, sid('a')); const b = sessions.retainFor(ctx, sid('b'))
  onTestFinished(async () => { a.release(); b.release(); await sessions.disposeScopes(); await ctx.fiber.dispose() })
  const source = pluginReferenceSource(ctx, sessions, () => '插件')
  const request = { query: '中文 @', quoted: true, drilled: false, position: 'inline' as const, signal: new AbortController().signal }
  return { ctx, sessions, source, lookup, request, listeners }
}

describe('plugin reference source', () => {
  it('keeps distinct stable mentions for duplicate Chinese labels and serializes the same clipboard identity', async () => {
    const { source, request, lookup } = await bench()
    const rows = await source.candidates({ sessionId: sid('a') }, request)
    expect(lookup).toHaveBeenCalledWith('a', '中文 @', request.signal)
    expect(rows.map(row => row.name)).toEqual(['中文 @ 插件', '中文 @ 插件'])
    expect(rows[0]?.description).not.toBe(rows[1]?.description)
    expect(rows[0]?.value).not.toBe(rows[1]?.value)
    for (const row of rows) {
      const pick = source.onPick({ candidate: row } as InputTriggerPick)
      expect(row.category).toBe('plugin')
      expect(pick).toMatchObject({ insert: { source: 'plugin-reference', label: row.name, ref: row.value, clipboardText: row.value } })
      expect(await source.codec!.serialize(row.value!, request.signal)).toBe(row.value)
      expect(source.codec!.clipboardText(row.value!)).toBe(row.value)
      expect(parsePluginReferenceText(row.value!).references).toHaveLength(1)
    }
    await source.candidates({ sessionId: sid('b') }, request)
    expect(lookup).toHaveBeenLastCalledWith('b', '中文 @', request.signal)
    expect(await source.candidates({ sessionId: sid('a') }, { ...request, drilled: true })).toEqual([])
    expect(await source.candidates({ sessionId: sid('missing') }, request)).toEqual([])
  })

  it('uses keyboard and pointer selection without letting IME or Escape choose a plugin', async () => {
    const { sessions, source } = await bench()
    const actx = sessions.scope(sid('a'))!
    const controller = new InputTriggerController({ actx, sessionId: sid('a'), roster: {
      sources: trigger => trigger === '@' ? [source] : [], all: () => [source],
    } })
    onTestFinished(() => { controller.dispose() })
    const inserts: InsertReferenceRequest[] = []
    actx.on('slash/input-insert-reference', (request) => { inserts.push(request); return true })
    const open = async (text: string, revision: number) => {
      controller.track(text, text.length, { tier: 'plain' }, revision)
      await vi.waitFor(() => { expect(controller.menu.getSnapshot().groups[0]?.items).toHaveLength(2) })
    }
    await open('@中文', 1)
    expect(controller.arbitrate('enter', true)).toBe('pass')
    expect(inserts).toEqual([])
    controller.arbitrate('down', false)
    controller.arbitrate('enter', false)
    expect(inserts[0]?.reference.ref).toBe(candidate('second').mention)
    await open('@另一个', 2)
    controller.arbitrate('escape', false)
    expect(controller.menu.getSnapshot().open).toBe(false)
    expect(inserts).toHaveLength(1)
    await open('@"中文 @', 3)
    controller.pick('plugin-reference', 0)
    expect(inserts[1]?.reference).toMatchObject({ label: '中文 @ 插件', ref: candidate('first').mention, clipboardText: candidate('first').mention })
    expect(controller.menu.getSnapshot().open).toBe(false)
  })

  it('subscribes to capability, preset and connection changes and cleans up all listeners', async () => {
    const { ctx, source, listeners } = await bench()
    const notify = vi.fn()
    const off = source.subscribeCandidates!({ sessionId: sid('a') }, notify)
    for (const name of ['plugin-capabilities/changed', 'agent-preset/selected']) {
      for (const listener of listeners.get(name) ?? []) listener()
    }
    ctx.emit('connection/reset')
    expect(notify).toHaveBeenCalledTimes(3)
    off()
    expect([...listeners.values()].every(set => set.size === 0)).toBe(true)
    ctx.emit('connection/reset')
    expect(notify).toHaveBeenCalledTimes(3)
  })

  it('does not downgrade cancellation or a Remote failure into a usable candidate', async () => {
    const { source, request, lookup } = await bench()
    const controller = new AbortController(); controller.abort(new Error('switched session'))
    await expect(source.candidates({ sessionId: sid('a') }, { ...request, signal: controller.signal })).rejects.toThrow('switched session')
    expect(lookup).not.toHaveBeenCalled()
    lookup.mockResolvedValueOnce({ ok: false, error: new RemoteError('gateway/internal', 'catalog unavailable', {}) })
    await expect(source.candidates({ sessionId: sid('a') }, request)).rejects.toThrow('catalog unavailable')
  })
})
