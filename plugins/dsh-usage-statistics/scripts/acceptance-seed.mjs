/** Synthetic durable history for the isolated install test; never ship this plugin. */
export const inject = ['sessionPersistence']
export async function apply(ctx) {
  const id = 'usage-statistics-validation-v4'
  if (await ctx.sessionPersistence.stat(id)) {
    ctx.provide('usageStatisticsAcceptanceSeed', true)
    return
  }
  const now = Date.now()
  const handle = await ctx.sessionPersistence.create({version: 4, id, createdAt: now - 90_000, isSeeded: false})
  try {
    await handle.append([
      {seq: 0, time: now - 90_000, type: 'turn/start', data: {turn: 1}},
      {seq: 1, time: now - 89_000, type: 'user/message', surfaceOp: 'append', data: {id: 'usage-validation-user', role: 'user', source: {kind: 'user'}, content: []}},
      {seq: 2, time: now - 88_000, type: 'step/start', data: {turn: 1, step: 1}},
      {seq: 3, time: now - 1000, type: 'assistant/message', surfaceOp: 'append', data: {
      turn: 1, step: 1, stream: [],
      usage: {inputTokens: 6000, outputTokens: 5000, cacheReadTokens: 19000, cacheWriteTokens: 0},
      message: {id: 'usage-validation-assistant', role: 'assistant', source: {kind: 'model', provider: 'synthetic', model: 'validation-only'}, content: []},
      }},
      {seq: 4, time: now - 500, type: 'step/end', data: {turn: 1, step: 1}},
      {seq: 5, time: now, type: 'turn/end', data: {turn: 1, reason: {kind: 'completed'}}},
    ])
    await handle.flush()
  } finally {
    await handle.close()
  }
  ctx.provide('usageStatisticsAcceptanceSeed', true)
}
