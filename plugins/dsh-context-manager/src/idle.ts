/** Idle maintenance only for successfully completed turns observed in this process. */
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { CompactionResult } from '@deepseek-ai/dsh-compaction'
import type {} from '@deepseek-ai/dsh-workspace'
import type {} from './index.ts'
import type { IdleStatus } from './idle-types.ts'
import type { Policy } from './policy.ts'

interface Entry {
  completed: boolean
  epoch: number
  idleSince: number
  status: IdleStatus
  timer?: ReturnType<typeof setTimeout>
  abort?: AbortController
  release: () => void
}

/** Bound read-only activity providers even when a provider ignores cancellation. */
async function withAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  let onAbort: () => void = () => {}
  const cancelled = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason)
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
  })
  try { return await Promise.race([work, cancelled]) }
  finally { signal.removeEventListener('abort', onAbort) }
}

/** Owns timers, cancellation and quiescence without driving a model turn. */
export class IdleCompactor {
  private readonly entries = new Map<Agent, Entry>()
  private readonly jobs = new Set<Promise<void>>()
  private disposed = false

  constructor(
    private readonly ctx: Context,
    private readonly owns: (agent: Agent) => boolean,
    private readonly compact: (agent: Agent, signal: AbortSignal) => Promise<CompactionResult | null>,
  ) {
    ctx.on('agent/status', ({ agent, status }) => {
      if (!owns(agent)) return
      const entry = this.entry(agent)
      if (status === 'running') {
        this.cancel(entry, '新任务正在执行')
        entry.completed = false
      } else if (entry.completed) {
        entry.idleSince = Date.now()
        this.schedule(agent, entry)
      } else {
        entry.status = { status: 'skipped', dueAt: null, message: '任务未正常完成，本轮不进行闲置压缩' }
      }
    })
    ctx.on('session/event', (session, event) => {
      const agent = ctx.agents.get(session.id)
      if (!agent || !owns(agent)) return
      const entry = this.entries.get(agent)
      if (!entry) return
      if (event.type === 'turn/end') entry.completed = event.data.reason.kind === 'completed'
      // A manual/other compaction invalidates a previously scheduled pass.
      if (event.type === 'compaction/start' && !entry.abort) {
        this.cancel(entry, '上下文已交由其他压缩操作处理')
        entry.completed = false
      }
    })
    ctx.on('agent/inbox/inserted', ({ agent }) => {
      const entry = this.entries.get(agent)
      if (!entry) return
      this.cancel(entry, '新消息已到达，优先继续会话')
      entry.completed = false
    })
    ctx.on('agent/disposed', ({ agent }) => {
      const entry = this.entries.get(agent)
      if (!entry) return
      this.cancel(entry, '会话已关闭')
      entry.release()
      this.entries.delete(agent)
    })
    ctx.on('workspace/session-stop', ({ sessionId }) => {
      for (const [agent, entry] of this.entries) if (agent.id === sessionId) {
        this.cancel(entry, '会话已停止')
        entry.completed = false
      }
    })
    ctx.on('settings/document-updated', () => {
      for (const [agent, entry] of this.entries) {
        const policy = ctx.contextManager.snapshot()
        if (!policy.enabled || !policy.idleEnabled) this.cancel(entry, '闲置自动压缩已关闭')
        else if (entry.completed && entry.timer) this.schedule(agent, entry)
      }
    })
  }

  private entry(agent: Agent): Entry {
    let entry = this.entries.get(agent)
    if (entry) return entry
    entry = { completed: false, epoch: 0, idleSince: 0, status: { status: 'waiting', dueAt: null, message: '等待本次运行中的任务正常完成' }, release: () => {} }
    const current = entry
    current.release = this.ctx.contextManager.registerIdle(agent.id, () => current.status)
    this.entries.set(agent, current)
    return current
  }

  private cancel(entry: Entry, message: string) {
    entry.epoch++
    if (entry.timer) clearTimeout(entry.timer)
    entry.timer = undefined
    entry.abort?.abort(new Error(message))
    entry.status = { status: 'cancelled', dueAt: null, message }
  }

  private schedule(agent: Agent, entry: Entry) {
    if (this.disposed || entry.abort) return
    if (entry.timer) clearTimeout(entry.timer)
    entry.timer = undefined
    const policy = this.ctx.contextManager.snapshot()
    if (!policy.enabled || !policy.idleEnabled) {
      entry.status = { status: 'off', dueAt: null, message: '闲置自动压缩已关闭' }
      return
    }
    if (agent.inbox.nextTurn.length || agent.inbox.nextStep.length) {
      entry.status = { status: 'skipped', dueAt: null, message: '有待处理消息，本轮不进行闲置压缩' }
      return
    }
    const dueAt = entry.idleSince + policy.idleMinutes * 60000
    entry.status = { status: 'scheduled', dueAt, message: '任务已完成，等待闲置时间达到设置值' }
    entry.timer = setTimeout(() => {
      entry.timer = undefined
      const job = this.run(agent, entry)
      this.jobs.add(job)
      void job.finally(() => this.jobs.delete(job)).catch(error => this.ctx.logger.warn('闲置压缩状态记录失败：%s', error))
    }, Math.max(0, dueAt - Date.now()))
    entry.timer.unref?.()
  }

  private ready(agent: Agent, entry: Entry, policy: Readonly<Policy>): boolean {
    return !this.disposed && this.owns(agent) && this.ctx.agents.get(agent.id) === agent && entry.completed
      && policy.enabled && policy.idleEnabled && agent.status === 'idle'
      && !agent.inbox.nextTurn.length && !agent.inbox.nextStep.length
  }

  private async run(agent: Agent, entry: Entry) {
    const controller = new AbortController()
    const epoch = entry.epoch
    entry.abort = controller
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(this.ctx.contextManager.snapshot().timeoutMs)])
    let before = 0
    let rearm = false
    const generation = agent.session.surface.replaceGeneration
    try {
      let policy = this.ctx.contextManager.snapshot()
      if (!this.ready(agent, entry, policy)) { entry.status = { status: 'skipped', dueAt: null, message: '会话状态已变化，本轮不整理' }; return }
      before = this.ctx.tokenMeter.measure(agent.session).totalTokens
      entry.status = { status: 'checking', dueAt: null, message: '正在检查会话是否可以整理' }
      // Providers include pending approvals, descendants and background jobs.
      const activity = await withAbort(this.ctx.waterfall('workspace/session-activity', { sessionId: agent.id }, () => Promise.resolve([])), signal)
      signal.throwIfAborted()
      if (activity.length) {
        entry.status = { status: 'skipped', dueAt: null, message: '后台任务尚未结束，本轮不进行闲置压缩' }
        return
      }
      const route = agent.session.requestHeader()?.config
      if (!route) throw new Error('尚无实际模型路由')
      const info = await this.ctx.llm.resolveModelInfo(route.provider, route.model, signal)
      signal.throwIfAborted()
      policy = this.ctx.contextManager.snapshot()
      if (!this.ready(agent, entry, policy)) return
      const dueAt = entry.idleSince + policy.idleMinutes * 60000
      if (dueAt > Date.now()) { rearm = true; return }
      const window = info.context?.contextWindow
      if (!window) throw new Error('当前模型未提供上下文窗口')
      const minimum = Math.max(policy.idleMinPercent, policy.targetPercent + 10)
      if (before < window * minimum / 100) {
        entry.status = { status: 'skipped', dueAt: null, message: `上下文不足 ${minimum}%，无需闲置压缩` }
        return
      }
      entry.status = { status: 'compacting', dueAt: null, message: '正在闲置压缩；新消息到达时让出', beforeTokens: before }
      const result = await this.compact(agent, signal)
      if (entry.epoch !== epoch) return
      const after = this.ctx.tokenMeter.measure(agent.session).totalTokens
      if (result) entry.status = { status: 'completed', dueAt: null, message: '闲置压缩已完成', beforeTokens: before, afterTokens: after }
      else entry.status = { status: 'skipped', dueAt: null, message: '没有可安全缩减的历史内容' }
    } catch (error) {
      if (entry.epoch !== epoch) return
      const applied = agent.session.surface.replaceGeneration > generation
      entry.status = { status: controller.signal.aborted ? 'cancelled' : 'failed', dueAt: null,
        message: applied ? '内容已替换，但压缩收尾未完成，请查看压缩记录' : controller.signal.aborted ? '闲置压缩已取消，原上下文保留' : '闲置压缩失败，原上下文保留；本轮不再重试',
        ...(applied ? { beforeTokens: before, afterTokens: this.ctx.tokenMeter.measure(agent.session).totalTokens } : {}),
      }
      if (!controller.signal.aborted) this.ctx.logger.warn('闲置压缩失败：%s', error)
    } finally {
      if (entry.abort === controller) entry.abort = undefined
      if (entry.epoch === epoch) {
        if (rearm) this.schedule(agent, entry)
        else entry.completed = false
      }
      else if (entry.completed && agent.status === 'idle') this.schedule(agent, entry)
      // One attempt per observed completed turn; waiting alone never re-arms it.
    }
  }

  /** Abort owned work and await settlement before releasing status readers. */
  async dispose(): Promise<void> {
    this.disposed = true
    for (const entry of this.entries.values()) this.cancel(entry, '上下文插件正在停用')
    await Promise.allSettled([...this.jobs])
    for (const entry of this.entries.values()) entry.release()
    this.entries.clear()
  }
}
