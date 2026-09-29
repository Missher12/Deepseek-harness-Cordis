import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate as immediate } from 'node:timers/promises'
import { createVolatile, updateVolatile } from '@deepseek-ai/cosmokit'
import { writeFileSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, createUserMessage, createMessage, ToolCallId, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { sessionFormatCatalog } from '@deepseek-ai/dsh-session-format-catalog'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import TokenMeter from '@deepseek-ai/dsh-token-meter'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import * as Retry from '@deepseek-ai/dsh-llm-retry'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Group from '@deepseek-ai/cordis-plugin-group'
import AgentPresets from '@deepseek-ai/dsh-agent-preset-registry'
import Manager from '../lib/index.js'
import Engine from '../lib/engine.js'
import { pressureHistory } from '../lib/inspector.js'
import { defaults, budget, validatePolicy } from '../lib/policy.js'
import { diagnosticsProjection } from '../lib/diagnostics.js'

class Adapter extends LlmAdapter {
  order = []; requests = []; summaries = []; work = 0
  constructor(options = {}) { super(); this.options = options }
  async resolveModel(provider, model) { return { provider, id: model, name: model, context: { contextWindow: model === 'small' ? 6000 : 10000 }, reasoning: { efforts: [{ id: 'high', name: 'High' }] } } }
  imageRequestPricing() { return { priceImages: images => images.map(() => ({ visualTokens: 7000, text: 'image handle' })) } }
  providerRetryPolicy() { return resolveRetryPolicy(this.options.mainFail ? { mode: 'normal', maxRetries: 0 } : { mode: 'always', backoff: { initialDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 } }, 'test') }
  async *stream(options) {
    if (options.purpose === 'compaction') {
      this.order.push('summary-start'); this.summaries.push(options)
      if (this.options.pause) await this.options.pause(options.signal)
      if (this.options.fail) { yield { type: 'finish', reason: { kind: 'error', failure: { code: 'SERVER', message: 'summary unavailable' } } }; return }
      const text = this.options.noShrink ? 'oversized '.repeat(9000) : 'Checkpoint: preserve pending task, continue after completed preparation.'
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'block-end', index: 0, block: { type: 'text', text } }
      yield { type: 'usage', usage: { inputTokens: 500, cacheReadTokens: 250, outputTokens: 20 } }
      this.order.push('summary-finish')
      yield { type: 'finish', reason: { kind: 'stop' } }; return
    }
    this.order.push('main'); this.requests.push(options)
    if (this.options.mainFail) { yield { type: 'finish', reason: { kind: 'error', failure: { code: 'BAD_REQUEST', message: 'fixture failure' } } }; return }
    if (this.options.mainPause) await this.options.mainPause(options.signal)
    if (this.options.reportUsage) yield { type: 'usage', usage: { inputTokens: this.options.usageInput ?? 1200, outputTokens: 40, cacheReadTokens: 300 } }
    if (this.options.overflow && this.requests.length === 1) {
      yield { type: 'finish', reason: { kind: 'error', failure: { code: 'CONTEXT_WINDOW_EXCEEDED', message: 'provider window exhausted' } } }; return
    }
    if (this.options.tools && this.requests.length === 1) {
      yield { type: 'block-start', index: 0, blockType: 'tool-call' }
      yield { type: 'block-end', index: 0, block: { type: 'tool-call', id: ToolCallId('work-1'), name: 'work', arguments: '{}' } }
      yield { type: 'finish', reason: { kind: 'tool-calls' } }; return
    }
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'done' } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

function history(length = 31600) {
  const session = Session.create(SessionId('seed'))
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  // Real sessions reserve surface node zero for the system prompt. Omitting
  // that head can pass in-memory replay but fails the persisted V4 decoder.
  session.append('system/message', { turn: 1, step: 1, message: createMessage({ role: 'system', content: [], source: { kind: 'system-prompt' } }) }, { surfaceOp: 'append' })
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'h'.repeat(length) }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  session.append('assistant/message', { stream: [], turn: 1, step: 1, message: createMessage({ role: 'assistant', content: [{ type: 'text', text: 'previous work done' }], source: { kind: 'model', provider: 'mock', model: 'large' } }) }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 1, step: 1 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  return session.snapshotEvents()
}

async function fixture(options = {}, policy = {}, seed = history()) {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(TokenMeter)
  await ctx.plugin(Retry)
  await ctx.plugin(Manager, { policy: { ...defaults, summaryMaxTokens: 512, ...policy } })
  await ctx.plugin(Engine)
  if (options.presets) {
    ctx.baseUrl = new URL('../', import.meta.url).href
    await ctx.plugin(Loader); ctx.loader.builtins.group = Group
    await ctx.plugin(AgentPresets, { default: 'one' })
    for (const id of ['one', 'two']) await ctx.plugin({ inject: ['agentPresets'], async *apply(child) {
      yield await child.agentPresets.register({ id, plugins: [{ name: 'cordis:group', group: true, isolate: { compaction: true }, config: [{ name: new URL('../lib/engine.js', import.meta.url).href }] }] })
    } })
  }
  const adapter = new Adapter(options)
  ctx.llm.registerAdapter(['mock'], adapter)
  ctx.tools.register(defineContentToolFixture({ name: 'work', description: 'Count work', parameters: {}, async execute() { adapter.work++; adapter.order.push('tool'); return [{ type: 'text', text: options.toolOutput ?? 'tool complete' }] } }))
  const { agent } = await ctx.agentLoop.createAgent(ctx, { sessionId: SessionId('subject'), seed, agentOptions: { provider: 'mock', model: 'large' }, ...(options.presets ? { setup: async agentCtx => { await ctx.agentPresets.mount(agentCtx, 'one') } } : {}) })
  return { ctx, adapter, agent }
}
const message = (text = '请完成当前任务；不要改动无关文件。') => createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })
const completed = agent => assert.equal(agent.session.snapshotEvents().at(-1).data.reason.kind, 'completed')

const idleState = (ctx, agent) => ctx.contextManager.idleStatus(agent.id)
async function drainUntil(predicate) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await immediate() }
  assert.ok(predicate(), 'asynchronous maintenance did not settle')
}
function clock(t) { t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() }) }
function changePolicy(ctx, patch) {
  updateVolatile(ctx.contextManager.config.policy, createVolatile({ ...ctx.contextManager.snapshot(), ...patch }))
  ctx.emit('settings/document-updated', 'context-manager', 2)
}

test('idle: old policy gains safe defaults and rejects invalid idle settings', () => {
  const { idleEnabled, idleMinutes, idleMinPercent, summaryInstructions, ...legacy } = defaults
  assert.deepEqual(Manager.Config({ policy: legacy }).policy.get(), defaults)
  for (const patch of [{ idleMinutes: 0 }, { idleMinutes: 1.5 }, { idleMinPercent: 96 }, { summaryInstructions: 'x'.repeat(2001) }]) {
    assert.throws(() => validatePolicy({ ...defaults, ...patch }))
  }
})

test('idle: restored history is dormant; a completed task arms exactly one maintenance pass with usage', { timeout: 8000 }, async t => {
  const { ctx, adapter, agent } = await fixture({}, { summaryInstructions: '保留验收命令与失败原因' }, history(28000))
  clock(t)
  try {
    assert.equal(idleState(ctx, agent).status, 'waiting')
    t.mock.timers.tick(900000); await immediate()
    assert.equal(adapter.summaries.length, 0)
    agent.followup(message()); await agent.whenIdle()
    assert.equal(idleState(ctx, agent).status, 'scheduled')
    t.mock.timers.tick(899999); await immediate(); assert.equal(adapter.summaries.length, 0)
    t.mock.timers.tick(1)
    await drainUntil(() => idleState(ctx, agent).status === 'completed')
    assert.deepEqual(adapter.order, ['main', 'summary-start', 'summary-finish'])
    assert.ok(JSON.stringify(adapter.summaries[0].messages).includes('保留验收命令与失败原因'))
    assert.equal(adapter.summaries[0].provider, 'mock')
    assert.ok(idleState(ctx, agent).afterTokens < idleState(ctx, agent).beforeTokens)
    const diagnostics = ctx.sessionProjections.snapshot(agent.session).values.contextManagerDiagnostics
    assert.equal(diagnostics.compactions[0].inputTokens, 750)
    assert.equal(diagnostics.compactions[0].outputTokens, 20)
    assert.equal(diagnostics.compactions[0].manual, true, 'between-turn compaction uses the host null-turn scope')
    const restore = sessionFormatCatalog.createRestore({ type: 'session', version: 4, id: 'idle-fixture', createdAt: 1, delegationDepth: 0, isSeeded: false }, { recovery: 'strict', validation: 'current' })
    for (const event of agent.session.snapshotEvents()) restore.decodeRow(JSON.parse(JSON.stringify(sessionFormatCatalog.encodeCurrentEvent(event))))
    assert.equal(restore.finish().events.length, agent.session.snapshotEvents().length)
    t.mock.timers.tick(86400000); await immediate()
    assert.equal(adapter.summaries.length, 1)
  } finally { await ctx.fiber.dispose() }
})

test('idle: short context and running background work skip model use', { timeout: 8000 }, async t => {
  clock(t)
  for (const background of [false, true]) {
    const { ctx, adapter, agent } = await fixture({}, {}, history(background ? 28000 : 2000))
    if (background) ctx.on('workspace/session-activity', async () => [{ kind: 'background', label: 'fixture work' }])
    try {
      agent.followup(message()); await agent.whenIdle(); t.mock.timers.tick(900000)
      await drainUntil(() => idleState(ctx, agent).status === 'skipped')
      assert.equal(adapter.summaries.length, 0)
      assert.match(idleState(ctx, agent).message, background ? /后台/ : /不足/)
    } finally { await ctx.fiber.dispose() }
  }
})

test('idle: failed and cancelled tasks never arm a timer', { timeout: 8000 }, async t => {
  clock(t)
  for (const cancel of [false, true]) {
    let enter; const entered = new Promise(resolve => { enter = resolve })
    const { ctx, adapter, agent } = await fixture(cancel ? { mainPause: signal => new Promise((_resolve, reject) => {
      enter(); signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    }) } : { mainFail: true }, {}, history(28000))
    try {
      agent.followup(message())
      if (cancel) { await entered; agent.cancel('user') }
      await agent.whenIdle(); assert.notEqual(idleState(ctx, agent).status, 'scheduled')
      t.mock.timers.tick(900000); await immediate(); assert.equal(adapter.summaries.length, 0)
    } finally { await ctx.fiber.dispose() }
  }
})

test('idle: new input cancels in-flight summary and resumes that exact task once', { timeout: 8000 }, async t => {
  let enter; const entered = new Promise(resolve => { enter = resolve })
  const { ctx, adapter, agent } = await fixture({ pause: signal => new Promise((_resolve, reject) => {
    enter(); signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  }) }, {}, history(28000))
  clock(t)
  try {
    agent.followup(message()); await agent.whenIdle(); t.mock.timers.tick(900000); await entered
    assert.equal(idleState(ctx, agent).status, 'compacting')
    const task = message('新任务必须完整执行一次'); agent.followup(task); await agent.whenIdle()
    await drainUntil(() => idleState(ctx, agent).status === 'scheduled')
    assert.equal(adapter.summaries.length, 1); assert.equal(adapter.requests.length, 2)
    assert.ok(adapter.summaries[0].signal.aborted)
    assert.deepEqual(agent.session.deriveMessages().find(m => m.id === task.id).content, task.content)
    assert.equal(agent.session.snapshotEvents().filter(e => e.type === 'user/message' && e.data.id === task.id).length, 1)
    assert.equal(agent.session.snapshotEvents().filter(e => e.type === 'compaction/summary').length, 0)
  } finally { await ctx.fiber.dispose() }
})

test('idle: live delay edits preserve elapsed idle time and disabling removes the deadline', { timeout: 8000 }, async t => {
  const { ctx, adapter, agent } = await fixture({}, {}, history(28000)); clock(t)
  try {
    agent.followup(message()); await agent.whenIdle()
    const due = idleState(ctx, agent).dueAt
    t.mock.timers.tick(600000); changePolicy(ctx, { idleMinutes: 20 })
    assert.equal(idleState(ctx, agent).dueAt, due + 300000)
    t.mock.timers.tick(300000); await immediate(); assert.equal(adapter.summaries.length, 0)
    changePolicy(ctx, { idleEnabled: false })
    t.mock.timers.tick(300000); await immediate(); assert.equal(idleState(ctx, agent).status, 'off')
    assert.equal(adapter.summaries.length, 0)
  } finally { await ctx.fiber.dispose() }
})

test('idle: lengthening delay during async safety checks re-arms a valid completed task', { timeout: 8000 }, async t => {
  const { ctx, adapter, agent } = await fixture({}, {}, history(28000)); clock(t)
  let release; let checks = 0
  ctx.on('workspace/session-activity', async () => { if (++checks === 1) await new Promise(resolve => { release = resolve }); return [] })
  try {
    agent.followup(message()); await agent.whenIdle(); t.mock.timers.tick(900000)
    await drainUntil(() => !!release)
    changePolicy(ctx, { idleMinutes: 20 }); release()
    await drainUntil(() => idleState(ctx, agent).status === 'scheduled')
    assert.equal(adapter.summaries.length, 0)
    t.mock.timers.tick(300000); await drainUntil(() => idleState(ctx, agent).status === 'completed')
    assert.equal(adapter.summaries.length, 1)
  } finally { await ctx.fiber.dispose() }
})

for (const kind of ['fail', 'noShrink']) test(`idle: ${kind} keeps original context and never loops`, { timeout: 8000 }, async t => {
  const { ctx, adapter, agent } = await fixture({ [kind]: true }, {}, history(28000)); clock(t)
  try {
    agent.followup(message()); await agent.whenIdle(); const before = agent.session.deriveMessages()
    t.mock.timers.tick(900000); await drainUntil(() => idleState(ctx, agent).status === 'failed')
    assert.deepEqual(agent.session.deriveMessages(), before)
    t.mock.timers.tick(86400000); await immediate(); assert.equal(adapter.summaries.length, 1)
    assert.equal(adapter.requests.length, 1)
  } finally { await ctx.fiber.dispose() }
})

test('idle: disposal cancels an unresponsive activity provider without starting a model call', { timeout: 8000 }, async t => {
  const { ctx, adapter, agent } = await fixture({}, {}, history(28000)); clock(t)
  ctx.on('workspace/session-activity', async () => new Promise(() => {}))
  agent.followup(message()); await agent.whenIdle(); t.mock.timers.tick(900000)
  await drainUntil(() => idleState(ctx, agent).status === 'checking')
  await ctx.fiber.dispose()
  assert.equal(adapter.summaries.length, 0)
})

test('idle: isolated preset owns its timer without a duplicate root engine', { timeout: 8000 }, async t => {
  const { ctx, adapter, agent } = await fixture({ presets: true }, {}, history(28000)); clock(t)
  try {
    agent.followup(message()); await agent.whenIdle(); t.mock.timers.tick(900000)
    await drainUntil(() => idleState(ctx, agent).status === 'completed')
    assert.equal(adapter.summaries.length, 1)
  } finally { await ctx.fiber.dispose() }
})

test('offline diagnostic fixture reports usage and retains replayable real-loop history', async () => {
  const { ctx, agent } = await fixture({ tools: true, reportUsage: true })
  try {
    agent.followup(message()); await agent.whenIdle(); completed(agent)
    const values = ctx.sessionProjections.snapshot(agent.session).values
    assert.equal(values.contextManagerDiagnostics.requests.length, 2)
    assert.equal(values.contextManagerDiagnostics.requests[0].input, 1500)
    assert.equal(values.contextPressure.pressureTokens, 1500)
    const restore = sessionFormatCatalog.createRestore({ type: 'session', version: 4, id: 'offline-fixture', createdAt: 1, delegationDepth: 0, isSeeded: false }, { recovery: 'strict', validation: 'current' })
    for (const event of agent.session.snapshotEvents()) restore.decodeRow(JSON.parse(JSON.stringify(sessionFormatCatalog.encodeCurrentEvent(event))))
    assert.equal(restore.finish().events.length, agent.session.snapshotEvents().length)
    writeFileSync(new URL('../verification/synthetic-session.json', import.meta.url), JSON.stringify({
      testSource: 'Synthetic adapter, real AgentLoop. No API calls or user conversation data.',
      events: agent.session.snapshotEvents(),
    }, null, 2) + '\n')
  } finally { await ctx.fiber.dispose() }
})

test('79.9% is inside the early admission boundary; output reservation can lower it', () => {
  assert.equal(budget(defaults, 100000, 8000).admission, 79000)
  assert.ok(79900 >= budget(defaults, 100000, 8000).admission)
  assert.equal(budget(defaults, 100000, 25000).admission, 72000)
  assert.throws(() => validatePolicy({ ...defaults, targetPercent: 75 }))
})

test('real loop: summary settles before the first main call and tool; current task is unchanged and enters once', { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture({ tools: true })
  try {
    const task = message(); agent.followup(task); await agent.whenIdle()
    assert.deepEqual(adapter.order, ['summary-start', 'summary-finish', 'main', 'tool', 'main'])
    assert.equal(adapter.work, 1)
    assert.equal(agent.session.snapshotEvents().filter(e => e.type === 'user/message' && e.data.id === task.id).length, 1)
    assert.deepEqual(adapter.requests[0].messages.find(m => m.id === task.id)?.content, task.content)
    assert.equal(agent.session.snapshotEvents().filter(e => e.type === 'compaction/summary').length, 1)
    const live = ctx.sessionProjections.snapshot(agent.session).values.contextManagerDiagnostics
    assert.equal(live.compactions.length, 1)
    assert.equal(live.compactions[0].status, 'completed')
    assert.equal(live.compactions[0].applied, true)
    assert.ok(live.compactions[0].beforeTokens > live.compactions[0].afterTokens)
    const replay = agent.session.snapshotEvents().reduce(diagnosticsProjection.apply, diagnosticsProjection.init())
    assert.deepEqual(diagnosticsProjection.wire.view(replay), live, 'fresh replay reproduces live diagnostics')
    completed(agent)
  } finally { await ctx.fiber.dispose() }
})

for (const kind of ['fail', 'noShrink']) test(`real loop: ${kind} pauses without business calls or unbounded retry`, { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture({ [kind]: true })
  try {
    const task = message(); agent.followup(task); await agent.whenIdle()
    assert.equal(adapter.requests.length, 0); assert.equal(adapter.work, 0); assert.equal(adapter.summaries.length, 1)
    assert.ok(agent.session.deriveMessages().some(m => m.id === task.id))
    assert.equal(agent.session.snapshotEvents().filter(e => e.type === 'compaction/summary').length, 0)
    const view = ctx.sessionProjections.snapshot(agent.session).values.contextManagerDiagnostics
    assert.equal(view.compactions[0].status, 'failed')
    assert.equal(view.compactions[0].applied, false)
  } finally { await ctx.fiber.dispose() }
})

test('real loop: cancelling the summary keeps the new task and never starts work', { timeout: 8000 }, async () => {
  let started; const entered = new Promise(resolve => { started = resolve })
  const { ctx, adapter, agent } = await fixture({ pause: signal => new Promise((resolve, reject) => { started(); signal.addEventListener('abort', () => reject(signal.reason), { once: true }) }) })
  try {
    const task = message(); agent.followup(task); await entered
    assert.equal(adapter.requests.length, 0); assert.equal(adapter.work, 0)
    agent.cancel('user'); await agent.whenIdle()
    assert.equal(adapter.requests.length, 0); assert.ok(agent.session.deriveMessages().some(m => m.id === task.id))
  } finally { await ctx.fiber.dispose() }
})

test('real loop: below threshold does not summarize', { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture({}, {}, history(2000))
  try { agent.followup(message()); await agent.whenIdle(); assert.equal(adapter.summaries.length, 0); assert.equal(adapter.requests.length, 1); completed(agent) }
  finally { await ctx.fiber.dispose() }
})

test('real loop: actual request route and reasoning effort are inherited by summary', { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture({}, {}, history(19000))
  ctx.on('agent/request', async (_payload, next) => ({ ...await next(), provider: 'mock', model: 'small', reasoningEffort: 'high' }))
  try {
    agent.followup(message()); await agent.whenIdle()
    assert.equal(adapter.summaries.length, 1); assert.equal(adapter.summaries[0].model, 'small'); assert.equal(adapter.summaries[0].reasoningEffort, 'high'); completed(agent)
  } finally { await ctx.fiber.dispose() }
})

test('real loop: oversized new task pauses and is never summarized away', { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture({}, {}, history(2000))
  try {
    const task = message('巨大新任务'.repeat(15000)); agent.followup(task); await agent.whenIdle()
    assert.equal(adapter.requests.length, 0); assert.ok(adapter.summaries.length <= 2)
    assert.deepEqual(agent.session.deriveMessages().find(m => m.id === task.id).content, task.content)
  } finally { await ctx.fiber.dispose() }
})

test('real preset scopes: two simultaneous sessions each compact exactly once, without root-engine duplication', { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture({ presets: true })
  try {
    assert.ok((await ctx.agentPresets.list()).every(p => !p.broken))
    const { agent: second } = await ctx.agentLoop.createAgent(ctx, { sessionId: SessionId('second'), seed: history(), agentOptions: { provider: 'mock', model: 'large' }, setup: async child => { await ctx.agentPresets.mount(child, 'two') } })
    agent.followup(message('任务一')); second.followup(message('任务二'))
    await Promise.all([agent.whenIdle(), second.whenIdle()])
    assert.equal(adapter.summaries.length, 2); assert.equal(adapter.requests.length, 2)
    for (const subject of [agent, second]) { assert.equal(subject.session.snapshotEvents().filter(e => e.type === 'compaction/summary').length, 1); completed(subject) }
  } finally { await ctx.fiber.dispose() }
})

test('real loop: tool growth is checked again before the next model request', { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture({ tools: true, toolOutput: 'result '.repeat(4500) }, {}, history(1000))
  try {
    const task = message(); agent.followup(task); await agent.whenIdle()
    assert.equal(adapter.requests.length, 2)
    assert.deepEqual(adapter.order, ['main', 'tool', 'summary-start', 'summary-finish', 'main'])
    assert.ok(agent.session.deriveMessages().some(m => m.id === task.id))
    assert.ok(adapter.summaries.length <= 2)
    completed(agent)
  } finally { await ctx.fiber.dispose() }
})

test('real loop: exactly 79.9% before new input compacts before any business call', { timeout: 8000 }, async () => {
  // Two content blocks/roles (16) plus the five-token historical response.
  const { ctx, adapter, agent } = await fixture({}, {}, history((7990 - 21) * 4))
  try {
    assert.equal(ctx.tokenMeter.measure(agent.session).totalTokens, 7990)
    agent.followup(message()); await agent.whenIdle()
    assert.deepEqual(adapter.order, ['summary-start', 'summary-finish', 'main']); completed(agent)
  } finally { await ctx.fiber.dispose() }
})

test('real loop: new image pricing participates in admission and its reference survives compaction', { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture({}, {}, history(6000))
  try {
    const image = { type: 'image', attachment: { attachmentId: 'sha256:12345678', mediaType: 'image/png', bytes: 2048, width: 800, height: 800, name: 'diagram.png' } }
    const task = createUserMessage({ content: [{ type: 'text', text: '分析图片，并继续原任务' }, image], source: { kind: 'user' } })
    agent.followup(task); await agent.whenIdle()
    assert.deepEqual(adapter.order, ['summary-start', 'summary-finish', 'main'])
    assert.deepEqual(adapter.requests[0].messages.find(m => m.id === task.id)?.content, task.content)
    completed(agent)
  } finally { await ctx.fiber.dispose() }
})

test('real loop: provider-confirmed overflow below the estimate uses bounded recovery', { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture({ overflow: true }, {}, history(14000))
  try {
    agent.followup(message()); await agent.whenIdle()
    assert.deepEqual(adapter.order, ['main', 'summary-start', 'summary-finish', 'main']); completed(agent)
  } finally { await ctx.fiber.dispose() }
})

test('real loop: successful compacted history can be replayed by a fresh Agent', { timeout: 8000 }, async () => {
  const { ctx, adapter, agent } = await fixture()
  try {
    agent.followup(message()); await agent.whenIdle(); completed(agent)
    const { agent: resumed } = await ctx.agentLoop.createAgent(ctx, { sessionId: SessionId('resumed'), seed: agent.session.snapshotEvents(), agentOptions: { provider: 'mock', model: 'large' } })
    resumed.followup(message('继续')); await resumed.whenIdle(); completed(resumed)
    assert.equal(adapter.summaries.length, 1); assert.equal(adapter.requests.length, 2)
  } finally { await ctx.fiber.dispose() }
})


test('projection trend replays genuine loop cuts and compaction drops without changing the Session', async () => {
  const { ctx, agent, adapter } = await fixture({ reportUsage: true, usageInput: 7800 }, { enabled: false }, history(28000))
  const snapshot = () => ({ events: agent.session.snapshotEvents(), header: agent.session.header, inheritedEventCount: agent.session.inheritedEventCount })
  try {
    const initial = snapshot()
    assert.ok(pressureHistory(ctx.sessionProjections, initial, initial.events.length - 1, AbortSignal.timeout(1000)).every(point => point.tokens === null), 'no usage does not invent a zero anchor')
    agent.followup(message()); await agent.whenIdle(); completed(agent)
    changePolicy(ctx, { enabled: true })
    agent.followup(message('继续完成')); await agent.whenIdle(); completed(agent)
    assert.equal(adapter.summaries.length, 1)
    const observed = snapshot(), before = JSON.stringify(observed.events)
    const points = pressureHistory(ctx.sessionProjections, observed, observed.events.length - 1, AbortSignal.timeout(3000))
    const replacement = points.findIndex(point => point.kind === 'replace' && point.tokens !== null)
    assert.ok(replacement > 0)
    assert.ok(points[replacement].tokens < points[replacement - 1].tokens, JSON.stringify(points))
    assert.equal(points.at(-1).tokens, ctx.sessionProjections.snapshot(agent.session).values.contextPressure.projectedTokens)
    assert.equal(JSON.stringify(agent.session.snapshotEvents()), before, 'projection history does not mutate or append records')
    writeFileSync(new URL('../verification/trend-session.json', import.meta.url), JSON.stringify({ testSource: 'Synthetic adapter through the real AgentLoop; no live API calls.', ...observed }, null, 2) + '\n')
    const cut = points[replacement].seq
    assert.equal(pressureHistory(ctx.sessionProjections, observed, cut, AbortSignal.timeout(3000)).at(-1).tokens, points[replacement].tokens)
    const cancelled = new AbortController(); cancelled.abort()
    assert.throws(() => pressureHistory(ctx.sessionProjections, observed, cut, cancelled.signal), { name: 'AbortError' })
  } finally { await ctx.fiber.dispose() }
})


test('projection trend bounds the output while folding the complete earlier prefix', async () => {
  const { ctx, agent } = await fixture({ reportUsage: true }, { enabled: false }, history(100))
  try {
    for (let i = 0; i < 42; i++) { agent.followup(message(`step ${i}`)); await agent.whenIdle() }
    const events = agent.session.snapshotEvents()
    const points = pressureHistory(ctx.sessionProjections, { events, header: agent.session.header, inheritedEventCount: agent.session.inheritedEventCount }, events.length - 1, AbortSignal.timeout(3000))
    assert.equal(points.length, 40)
    assert.ok(points[0].seq > 0)
    assert.ok(points.every(point => point.tokens > 0))
    assert.equal(points.at(-1).tokens, ctx.sessionProjections.snapshot(agent.session).values.contextPressure.projectedTokens)
  } finally { await ctx.fiber.dispose() }
})
