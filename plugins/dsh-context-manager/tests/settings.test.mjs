import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { buildSync } from 'esbuild'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { defaults } from '../lib/policy.js'

const require = createRequire(import.meta.url)
// Render the host's actual control implementations. Their CSS modules are
// compiled here; visual/theme acceptance runs separately in the real Web host.
const primitivesBuild = buildSync({
  stdin: { contents: ['Button', 'Input', 'Switch', 'SegmentedTabs', 'Tag', 'Tooltip', 'settings-form/SettingsForm'].map(name =>
    `export { ${name.split('/').at(-1)} } from ${JSON.stringify(require.resolve(`@deepseek-ai/dsh-client-ui-primitives/src/${name}.tsx`))}`).join('\n'), resolveDir: process.cwd() },
  outfile: '/virtual/context-manager-primitives.cjs', bundle: true, platform: 'node', format: 'cjs',
  external: ['react', 'react/*', 'react-dom', 'react-dom/*'], loader: { '.css': 'local-css' }, jsx: 'automatic',
  tsconfigRaw: { compilerOptions: { target: 'ES2022' } }, write: false,
})

test('overview keeps estimated composition separate, handles missing usage, and exposes over-window values', () => {
  const values = { contextPressure: { projectedTokens: 102000, pressureTokens: 95000, contextWindow: 100000 },
    contextBreakdown: { systemTokens: 1000, toolsTokens: 2000, messageTokens: 3000 },
    tokenUsage: { uncachedInputTokens: 999999, cacheReadTokens: 2, cacheWriteTokens: 3, outputTokens: 4 } }
  const html = renderToStaticMarkup(React.createElement(client.ContextReadout, { values, policy: defaults }))
  assert.match(html, /102\.0%/)
  assert.match(html, /预计超出窗口/)
  assert.match(html, /相加不等于上面的模型用量/)
  assert.match(html, /999,999/)
  assert.ok(!html.includes('999.9%'))
  const unknown = renderToStaticMarkup(React.createElement(client.ContextReadout, { values: {}, policy: defaults }))
  assert.match(unknown, /等待模型返回用量/)
  assert.ok(!unknown.includes('NaN') && !unknown.includes('0.0%'))
})

test('settings section contains only policy controls and does not read any session', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const snapshot = { status: 'ready', writable: true, mode: 'host', revision: 4, value: { policy: { ...defaults } } }
  const form = { subscribe: () => () => {}, getSnapshot: () => snapshot, mutate: () => { throw new Error('unexpected write') } }
  const root = createRoot(document.getElementById('root'))
  const click = async text => act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === text).click())
  try {
    await act(async () => root.render(React.createElement(client.ContextPage, { form })))
    assert.equal(document.querySelectorAll('style').length, 2)
    assert.equal(document.querySelectorAll('style:not([data-plugin="dsh-context-manager"])').length, 0,
      'page and nested settings styles must not be claimed by another plugin')
    assert.equal(document.querySelectorAll('[role="tab"]').length, 0)
    assert.equal(document.querySelectorAll('select').length, 0)
    await click('提前整理 · 70%')
    assert.equal(document.querySelector('[aria-label="上下文用到多少时压缩"]').value, '70')
  } finally { await act(async () => root.unmount()); dom.window.close(); delete globalThis.window; delete globalThis.document }
})
const primitivesScope = { module: { exports: {} }, require }
vm.runInNewContext(primitivesBuild.outputFiles.find(file => file.path.endsWith('.cjs')).text, primitivesScope)
let client
vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
  AbortController, setTimeout, clearTimeout,
  window: { __ModuleLoader__: { load: module => { client = module.factory(name =>
    name === '@deepseek-ai/dsh-client-ui-primitives' ? primitivesScope.module.exports : require(name)) } } },
})

test('client registers the native conversation tab after trajectory and binds its actual Session', async () => {
  const slots = []
  const bindings = []; const directories = []; const pulse = {}; const directory = {}; const disposers = []
  const ctx = { configForms: { get: () => ({}), whileServed: (_ns, callback) => callback() },
    remote: { $mount: async () => () => {}, contextInspector: {} },
    sessions: { binding: id => { bindings.push(id); return { session: { projections: { faceOf: key => { assert.equal(key, 'contextPressure'); return pulse } } } } } },
    modelDirectories: { directoryFor: id => { directories.push(id); return { store: directory } } },
    slots: { inject: (_slot, callback) => callback(), register: options => { slots.push(options); return () => {} } },
    effect: callback => { disposers.push(callback()) }, inject: (_keys, callback) => callback(ctx) }
  await client.apply(ctx)
  assert.deepEqual(slots.map(slot => slot.name), ['conversation.input.right', 'settings.section', 'conversation.view'])
  assert.equal(slots[2].order, 20); assert.equal(slots[2].label, '上下文')
  const injected = slots[2].inject('visible-session')
  assert.equal(injected.target, 'visible-session'); assert.equal(injected.pulse, pulse)
  assert.deepEqual(bindings, ['visible-session'])
  assert.equal(slots[0].inject('visible-session').directory, directory)
  assert.deepEqual(directories, ['visible-session'])
  for (const dispose of disposers) dispose?.()
})

test('tariff indicator shares the picker default without history or usage and follows accepted model switches', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const listeners = new Set()
  let snapshot = { current: { provider: 'deepseek-official', model: 'deepseek-flash' }, pending: null }
  const directory = { subscribe: cb => { listeners.add(cb); return () => listeners.delete(cb) }, getSnapshot: () => snapshot }
  const root = createRoot(document.getElementById('root'))
  const publish = async patch => act(async () => { snapshot = { ...snapshot, ...patch }; listeners.forEach(cb => cb()) })
  const select = current => publish({ current, pending: null })
  try {
    await act(async () => root.render(React.createElement(client.PeakIndicator, { directory })))
    assert.ok(document.querySelector('[aria-label^="DeepSeek 官方计费"]'), 'fresh default official model displays before first request or usage reading')
    assert.equal(document.querySelector('.cmi-peak a').href, 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/')
    assert.equal(document.querySelector('.cmi-peak style').dataset.plugin, 'dsh-context-manager')
    await publish({ pending: { provider: 'third-party', model: 'deepseek-flash' } })
    assert.ok(document.querySelector('.cmi-peak'), 'pending switch keeps the currently displayed model')
    await publish({ pending: null, error: 'selection failed' })
    assert.ok(document.querySelector('.cmi-peak'), 'failed switch keeps the accepted selection')
    await select({ provider: 'third-party', model: 'deepseek-flash' })
    assert.equal(document.querySelector('.cmi-peak'), null, 'same model name on third-party route is not official')
    await publish({ pending: { provider: 'deepseek-account', model: 'deepseek-v4-pro' } })
    assert.equal(document.querySelector('.cmi-peak'), null, 'unconfirmed official selection does not claim success')
    await select({ provider: 'deepseek-account', model: 'deepseek-v4-pro' })
    assert.ok(document.querySelector('.cmi-peak'))
    await select(null); assert.equal(document.querySelector('.cmi-peak'), null)
  } finally {
    await act(async () => root.unmount()); assert.equal(listeners.size, 0)
    dom.window.close(); delete globalThis.window; delete globalThis.document
  }
})

test('inspector cancels stale Session reads, never flashes another Session and releases subscriptions', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const listeners = new Set(); const calls = []
  const state = { status: 'ready', writable: true, revision: 1, value: { policy: defaults } }
  const form = { subscribe: () => () => {}, getSnapshot: () => state }
  const pulse = { subscribe: cb => { listeners.add(cb); return () => listeners.delete(cb) }, getSnapshot: () => 1 }
  const api = { inspect: (query, signal) => new Promise(resolve => calls.push({ query, signal, resolve })), content: () => { throw new Error('content is lazy') } }
  const snapshot = sessionId => ({ sessionId, cursor: 1, cutSeq: 1, sampledAt: 1000, historical: false,
    pressure: null, official: null, usage: null, model: { provider: 'fixture', model: sessionId, effort: null, maxTokens: null },
    parts: [], rows: [], total: 0, offset: 0, pageSize: 50, activeCount: 0, archivedCount: 0, requests: [], requestCount: 0, compactions: [] })
  const root = createRoot(document.getElementById('root'))
  const render = async target => { await act(async () => root.render(React.createElement(client.ContextInspectorView, { target, form, api, pulse }))); await act(async () => new Promise(resolve => setTimeout(resolve, 230))) }
  try {
    await render('first-session')
    await render('second-session')
    assert.equal(calls[0].signal.aborted, true)
    await act(async () => calls[0].resolve(snapshot('first-session')))
    assert.ok(!document.body.textContent.includes('fixture / first-session'))
    await act(async () => calls[1].resolve(snapshot('second-session')))
    assert.match(document.body.textContent, /fixture \/ second-session/)
    assert.match(document.body.textContent, /等待完整参数/)
    assert.equal(document.querySelectorAll('[role="tab"]').length, 0, 'all context sections share one panel')
    for (const title of ['上下文组成', '最近压缩', '收起详细内容与记录', '模型携带了哪些内容', '上下文如何变化', '模型与累计用量']) assert.ok(document.body.textContent.includes(title), title)
    assert.ok(document.querySelector('#cmi-content-panel'), 'details open on entering the view')
    assert.ok(!document.body.textContent.includes('预计可继续执行'))
    assert.equal(document.querySelectorAll('style:not([data-plugin="dsh-context-manager"])').length, 0)
    await render('third-session')
    assert.ok(!document.body.textContent.includes('fixture / second-session'))
  } finally {
    await act(async () => root.unmount())
    assert.equal(calls.at(-1).signal.aborted, true); assert.equal(listeners.size, 0)
    dom.window.close(); delete globalThis.window; delete globalThis.document
  }
})

test('read-only view hides only its own composer, restores drafts and reads only the selected body by default', async () => {
  const dom = new JSDOM(`<div data-conversation-content data-conversation-session="visible-session"><div data-conversation-scroll><div id="root"></div><div data-composer-seat style="display: flex; color: red"><textarea>unsent draft</textarea></div></div></div><div data-conversation-content data-conversation-session="other-session"><div data-conversation-scroll><div data-composer-seat><textarea>other draft</textarea></div></div></div>`, { url: 'http://localhost' })
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const state = { status: 'ready', writable: true, revision: 1, value: { policy: defaults } }
  const form = { subscribe: () => () => {}, getSnapshot: () => state }
  const pulse = { subscribe: () => () => {}, getSnapshot: () => 1 }
  const categories = ['system', 'tools', 'user', 'inject', 'skill', 'assistant', 'tool']
  const row = { id: 'body', seq: 1, title: 'test body', category: 'user', current: true, source: 'test', tokens: 20, images: 0 }
  let reads = 0
  const api = { inspect: async query => ({ ...query, cursor: 1, cutSeq: 1, sampledAt: 1000, historical: false, pressure: null, official: null, usage: null, model: null,
    parts: categories.map((category, i) => ({ category, tokens: 70 - i * 10 })), rows: [row], total: 1, pageSize: 50, activeCount: 1, archivedCount: 0,
    requests: [], requestCount: 0, compactions: [1, 2, 3, 4].map(id => ({ id: String(id), kind: 'compact', status: 'completed', startedAt: 1000, applied: true, beforeTokens: 20, afterTokens: 10 })) }),
    content: async query => { reads++; return { ...query, text: 'read-only content', totalChars: 17, nextOffset: null } } }
  const root = createRoot(document.getElementById('root'))
  const [seat, other] = document.querySelectorAll('[data-composer-seat]')
  const render = async () => { await act(async () => root.render(React.createElement(client.ContextInspectorView, { target: 'visible-session', form, api, pulse }))); await act(async () => new Promise(resolve => setTimeout(resolve, 230))) }
  const click = async text => act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === text).click())
  try {
    await render()
    assert.equal(seat.style.display, 'none'); assert.equal(seat.style.getPropertyPriority('display'), 'important')
    assert.ok(seat.hasAttribute('hidden') && seat.hasAttribute('inert'))
    assert.equal(other.getAttribute('style'), null); assert.equal(other.hasAttribute('hidden'), false)
    assert.equal(reads, 1, 'expanded details fetch only the selected body')
    assert.equal(document.querySelectorAll('.cmi-parts > button').length, 3)
    assert.equal(document.querySelectorAll('.cmi-events > li').length, 2)
    await click('全部 7 类'); assert.equal(document.querySelectorAll('.cmi-parts > button').length, 7)
    await click('全部 4 条'); assert.equal(document.querySelectorAll('.cmi-events > li').length, 4)
    assert.match(document.querySelector('.cmi-body').textContent, /read-only content/)
    await click('收起详细内容与记录'); assert.equal(document.querySelector('#cmi-content-panel'), null)
    await click('展开详细内容与记录')
    assert.equal(reads, 2)
    await click('收起详细内容与记录'); assert.equal(document.querySelector('#cmi-content-panel'), null)
    await act(async () => root.render(null))
    assert.equal(seat.style.display, 'flex'); assert.equal(seat.style.color, 'red')
    assert.equal(seat.hasAttribute('hidden'), false); assert.equal(seat.hasAttribute('inert'), false)
    assert.equal(seat.querySelector('textarea').value, 'unsent draft')
    assert.equal(other.querySelector('textarea').value, 'other draft')
    // An existing hidden/inert state belongs to the host and must survive us.
    seat.setAttribute('hidden', 'until-found'); seat.setAttribute('inert', 'host-owned')
    await render(); await act(async () => root.render(null))
    assert.equal(seat.getAttribute('hidden'), 'until-found'); assert.equal(seat.getAttribute('inert'), 'host-owned')
    assert.equal(seat.style.display, 'flex')
  } finally { await act(async () => root.unmount()); dom.window.close(); delete globalThis.window; delete globalThis.document }
})

test('details reopen for each visit or target, stay collapsed on refresh, and cancel stale paginated bodies', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const state = { status: 'ready', writable: true, revision: 1, value: { policy: defaults } }
  const form = { subscribe: () => () => {}, getSnapshot: () => state }
  const listeners = new Set(); let revision = 0
  const pulse = { subscribe: cb => { listeners.add(cb); return () => listeners.delete(cb) }, getSnapshot: () => revision }
  const inspections = []; const bodies = []
  const rows = Array.from({ length: 51 }, (_, seq) => ({ id: `event:${seq}`, seq, title: `item ${seq}`, category: 'user', current: true, source: 'fixture', tokens: 20, images: 0 }))
  const api = {
    inspect: async query => {
      inspections.push(query)
      return { ...query, cursor: 100, cutSeq: 100, sampledAt: 1000, historical: false, pressure: null, official: null,
        usage: { input: 123, output: 45, cacheRead: 60 }, model: null, parts: [], rows: rows.slice(query.offset, query.offset + 50),
        total: rows.length, pageSize: 50, activeCount: rows.length, archivedCount: 0, requests: [], requestCount: 0, compactions: [] }
    },
    content: (query, signal) => new Promise(resolve => bodies.push({ query, signal, resolve })),
  }
  const root = createRoot(document.getElementById('root'))
  const settle = () => act(async () => new Promise(resolve => setTimeout(resolve, 230)))
  const render = target => act(async () => root.render(React.createElement(client.ContextInspectorView, { target, form, api, pulse })))
  const click = text => act(async () => {
    const button = [...document.querySelectorAll('button')].find(button => button.textContent === text)
    assert.ok(button && !button.disabled, text); button.click()
  })
  const reply = (call, text, nextOffset = null, totalChars = text.length) => act(async () => call.resolve({ ...call.query, text, nextOffset, totalChars }))
  const content = () => document.querySelector('#cmi-content-panel')
  try {
    await render('a'); await settle()
    assert.ok(content()); assert.ok(document.querySelector('#cmi-history-panel'))
    for (const title of ['模型携带了哪些内容', '上下文如何变化', '模型与累计用量', '累计输入']) assert.ok(document.body.textContent.includes(title), title)
    assert.equal(document.querySelectorAll('.cmi-content-list > button').length, 50)
    assert.equal(bodies.length, 1, 'opening details does not prefetch all 51 bodies')
    await reply(bodies[0], 'a'.repeat(16000), 16000, 32000)
    await click('下一段')
    assert.equal(bodies.length, 2); assert.equal(bodies[1].query.offset, 16000)
    await render('b')
    assert.equal(bodies[1].signal.aborted, true)
    assert.equal(document.querySelector('.cmi-body'), null, 'target switch clears old body immediately')
    await reply(bodies[1], 'late body from a')
    assert.ok(!document.body.textContent.includes('late body from a'))
    await settle()
    assert.ok(content()); assert.equal(bodies[2].query.sessionId, 'b'); assert.equal(bodies[2].query.offset, 0)
    await click('收起详细内容与记录')
    assert.equal(bodies[2].signal.aborted, true)
    await reply(bodies[2], 'late body from b')
    assert.equal(content(), null); assert.ok(!document.body.textContent.includes('late body from b'))
    const readsBeforeRefresh = bodies.length
    const inspectionsBeforeRefresh = inspections.length
    await click('刷新数据'); await settle()
    assert.equal(inspections.length, inspectionsBeforeRefresh + 1)
    assert.equal(content(), null); assert.equal(bodies.length, readsBeforeRefresh)
    await act(async () => { revision++; listeners.forEach(cb => cb()) }); await settle()
    assert.equal(inspections.length, inspectionsBeforeRefresh + 2)
    assert.equal(content(), null); assert.equal(bodies.length, readsBeforeRefresh, 'projection refresh preserves manual collapse')
    await render('a'); await settle()
    assert.ok(content(), 'changing target resets collapsed state to open')
    assert.equal(bodies.at(-1).query.sessionId, 'a'); assert.equal(bodies.at(-1).query.offset, 0)
    await reply(bodies.at(-1), 'new a body')
    await click('下一页'); await settle()
    assert.equal(inspections.at(-1).offset, 50)
    assert.equal(document.querySelectorAll('.cmi-content-list > button').length, 1)
    assert.equal(bodies.at(-1).query.id, 'event:50')
    await reply(bodies.at(-1), 'last page body')
    await click('收起详细内容与记录')
    await act(async () => root.render(null))
    await render('a'); await settle()
    assert.ok(content(), 'reopening the same target starts expanded')
    assert.equal(inspections.at(-1).offset, 0); assert.equal(bodies.at(-1).query.id, 'event:0')
  } finally {
    await act(async () => root.unmount())
    for (const body of bodies) assert.equal(body.signal.aborted, true)
    assert.equal(listeners.size, 0)
    dom.window.close(); delete globalThis.window; delete globalThis.document
  }
})

test('settings UI stages edits, validates them and saves the complete policy with a revision fence', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const listeners = new Set(); const writes = []
  let snapshot = { status: 'ready', writable: true, mode: 'host', revision: 4, value: { policy: { ...defaults } } }
  const form = { subscribe: cb => { listeners.add(cb); return () => listeners.delete(cb) }, getSnapshot: () => snapshot,
    async mutate(ops, revision) { writes.push({ ops, revision }); snapshot = { ...snapshot, revision: 5, value: { policy: ops[0].value } }; listeners.forEach(cb => cb()); return true } }
  const root = createRoot(document.getElementById('root'))
  try {
    await act(async () => root.render(React.createElement(client.ContextSettings, { form })))
    assert.equal(document.querySelector('style').dataset.plugin, 'dsh-context-manager')
    assert.match(document.body.textContent, /79\.9%/)
    const buttons = () => [...document.querySelectorAll('button')]
    await act(async () => buttons().find(b => b.textContent === '提前整理 · 70%').click())
    assert.equal(writes.length, 0)
    assert.equal(document.querySelector('[aria-label="上下文用到多少时压缩"]').value, '70')
    await act(async () => buttons().find(b => b.textContent === '保存设置').click())
    assert.equal(writes.length, 1); assert.equal(writes[0].revision, 4)
    assert.equal(writes[0].ops[0].value.triggerPercent, 70)
    assert.equal(writes[0].ops[0].value.targetPercent, 40)
    assert.match(document.body.textContent, /已保存/)
    await act(async () => document.querySelector('[role="switch"]').click())
    assert.match(document.body.textContent, /自动压缩已关闭/)
    assert.equal(writes.length, 1, 'toggling the native switch still only stages an edit')
  } finally { await act(async () => root.unmount()); dom.window.close(); delete globalThis.window; delete globalThis.document }
})
