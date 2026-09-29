import { expect, test } from 'vitest'
import type { ConfigForm, ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { DEFAULTS, preferences, type Preferences } from '../src/preferences.ts'
import { createPreferences } from '../src/client/settings.ts'
import { Config } from '../src/index.ts'

function form(accept = true) {
  let snapshot: ConfigFormSnapshot<Preferences> = { value: { ...DEFAULTS }, base: DEFAULTS, user: {}, revision: 0, writable: true, status: 'ready', mode: 'host' }
  const subscribers = new Set<() => void>()
  const writes: [string, unknown][] = []
  const api: ConfigForm<Preferences> = {
    getSnapshot: () => snapshot,
    subscribe: listener => { subscribers.add(listener); return () => subscribers.delete(listener) },
    async set(key, value) {
      writes.push([key, value])
      if (accept) snapshot = { ...snapshot, value: { ...snapshot.value!, [key]: value }, revision: snapshot.revision! + 1 }
      subscribers.forEach(listener => listener())
      return accept
    },
    async mutate() { return false }, async unset() { return false },
  }
  return { api, writes, subscribers, readOnly: () => { snapshot = { ...snapshot, writable: false }; subscribers.forEach(fn => fn()) } }
}
test('layout, motion, spacing and type size persist independently through the native namespace', async () => {
  const host = form()
  const control = createPreferences(host.api)
  await control.set('layout', 'compact')
  await control.set('motion', 'smooth')
  await control.set('density', 'tight')
  await control.set('textSize', 'large')
  const saved = { layout: 'compact', motion: 'smooth', density: 'tight', textSize: 'large' }
  expect(control.store.getSnapshot().value).toEqual(saved)
  expect(host.writes).toEqual([['layout', 'compact'], ['motion', 'smooth'], ['density', 'tight'], ['textSize', 'large']])
  control.dispose()
  const reloaded = createPreferences(host.api)
  expect(reloaded.store.getSnapshot().value).toEqual(saved)
  reloaded.dispose()
  expect(host.subscribers.size).toBe(0)
})
test('a refused write restores accepted appearance and exposes failure', async () => {
  const host = form(false)
  const control = createPreferences(host.api)
  await control.set('layout', 'cards')
  expect(control.store.getSnapshot()).toMatchObject({ value: DEFAULTS, error: true, saving: false })
  control.dispose()
})
test('read-only settings do not make promises about persistence', async () => {
  const host = form()
  const control = createPreferences(host.api)
  host.readOnly()
  await control.set('motion', 'smooth')
  expect(host.writes).toEqual([])
  expect(control.store.getSnapshot().writable).toBe(false)
  control.dispose()
})
test('malformed persisted values fall back inside the owning namespace', () => {
  expect(preferences({ layout: 'unknown', motion: [], density: 0, textSize: 'huge' })).toEqual(DEFAULTS)
  expect(preferences(null)).toEqual(DEFAULTS)
})
test.each([['split', 'reader'], ['timeline', 'compact']])('legacy %s loads in the Host and reads as %s without changing saved values', (layout, expected) => {
  const stored = { layout, motion: 'smooth' }
  const accepted = Config(stored)
  expect(preferences(stored)).toEqual({ ...DEFAULTS, layout: expected, motion: 'smooth' })
  expect(accepted.layout.get()).toBe(layout)
  expect(accepted.motion.get()).toBe('smooth')
  expect(accepted.density.get()).toBe(DEFAULTS.density)
  expect(accepted.textSize.get()).toBe(DEFAULTS.textSize)
})
