/** Read-only projection of the current Cordis Loader plugin entries. */

import type { Context, FiberState } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/cordis-plugin-loader'
// Type-only: the optional agent-preset roster resolved through `ctx.get`.
import type {} from '@deepseek-ai/dsh-agent-preset-registry'
import type {} from '@deepseek-ai/dsh-app-boot'
import { TypertRemoteService, Remote, RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { readPluginCapabilities } from './capabilities.ts'
import { parsePluginReferenceText } from './reference.ts'
import type {} from './reference-plugin.ts'
// Typert-generated ./typert and ./remote artifacts import Zod at runtime.
import type {} from 'zod'
import type {
  AgentPresetPluginGroup,
  PluginEntryId,
  PluginFiberPhase,
  PluginInventoryEntry,
  PluginInventorySnapshot,
  PluginCapabilityCandidate,
  CapabilityCatalogConfig,
  PluginInstanceId,
} from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    pluginInventory: PluginInventoryGateway
  }
}

/**
 * Brand an existing Loader-tree entry id at the owning boundary.
 * @param value - the entry id as the Loader tree spells it.
 * @returns the same id as the inventory's branded entry id.
 */
export function pluginEntryId(value: string): PluginEntryId {
  return value as PluginEntryId
}

/** Runtime mirror: FiberState is a cross-package const enum. */
const FIBER_STATE = {
  PENDING: 0 as FiberState.PENDING,
  LOADING: 1 as FiberState.LOADING,
  ACTIVE: 2 as FiberState.ACTIVE,
  FAILED: 3 as FiberState.FAILED,
  DISPOSED: 4 as FiberState.DISPOSED,
  UNLOADING: 5 as FiberState.UNLOADING,
} as const

/** Complete public projection of Cordis Fiber states. */
const FIBER_PHASE = {
  [FIBER_STATE.PENDING]: 'pending',
  [FIBER_STATE.LOADING]: 'loading',
  [FIBER_STATE.ACTIVE]: 'active',
  [FIBER_STATE.FAILED]: 'failed',
  [FIBER_STATE.DISPOSED]: null,
  [FIBER_STATE.UNLOADING]: 'unloading',
} as const satisfies Record<FiberState, PluginFiberPhase>

/** Loader inventory and Agent-scoped callable-plugin discovery. */
export class PluginInventoryGateway extends TypertRemoteService {
  static inject = ['loader']
  static Config: z<CapabilityCatalogConfig> = z.object({
    candidateLimit: z.natural().min(1).default(50),
    toolLimit: z.natural().min(1).default(64),
    descriptionMaxChars: z.natural().min(1).default(240),
  })

  private readonly config: Required<CapabilityCatalogConfig>

  constructor(ctx: Context, config: CapabilityCatalogConfig = {}) {
    super(ctx, 'pluginInventory')
    this.config = {
      candidateLimit: config.candidateLimit ?? 50,
      toolLimit: config.toolLimit ?? 64,
      descriptionMaxChars: config.descriptionMaxChars ?? 240,
    }
    ctx.on('tools/change', () => { ctx.emit('plugin-capabilities/changed') })
    ctx.on('internal/status', (fiber) => {
      if (fiber.entry !== undefined) ctx.emit('plugin-capabilities/changed')
    }, { global: true })
    // The inventory remains mounted when its optional resolver is disabled.
    // Previously queued canonical references must fail instead of becoming paths.
    ctx.on('agent/pre-step', async (_request, next) => {
      const decision = await next()
      if (decision.kind === 'reject' || ctx.get('pluginReferenceResolver')?.isAvailable()) return decision
      for (const message of decision.messages) {
        if (message.source.kind !== 'user') continue
        for (const block of message.content) {
          if (block.type === 'text' && parsePluginReferenceText(block.text).references.length > 0) {
            throw new RemoteError('gateway/bad-request', 'Plugin references are unavailable: their resolver is not active', {})
          }
        }
      }
      return decision
    })
  }

  /**
   * Read the Loader directly on every call. Cordis's internal plugin/status
   * events already maintain Entry.fiber and Fiber.state, so a second cache
   * would only add another lifecycle truth to keep synchronized.
   *
   * When an agent-preset roster is composed, the snapshot also carries each
   * preset's composition rows, because those rows — not the Loader's own
   * entries — are where a deployment that mounts the roster runs its
   * model-facing plugins.
   * @returns Current non-group Loader entries in Loader order, with optional display metadata
   * and per-preset compositions when a roster is composed.
   */
  @Remote('list')
  async list(): Promise<PluginInventorySnapshot> {
    return readPluginInventory(this.ctx)
  }

  /**
   * List only currently callable plugin instances for a target Agent.
   * @param agent - target Agent resolved by the Remote's Session lookup.
   * @param query - case-insensitive module, title or tool-name substring.
   * @param signal - caller cancellation, checked before reading the catalog.
   * @returns bounded candidates with canonical mentions and execution modes.
   */
  @Remote('candidates')
  async candidates(agent: Agent, query: string, signal: AbortSignal): Promise<PluginCapabilityCandidate[]> {
    signal.throwIfAborted()
    if (!this.ctx.get('pluginReferenceResolver')?.isAvailable()) return Promise.resolve([])
    const needle = query.toLocaleLowerCase()
    return Promise.resolve(readPluginCapabilities(this.ctx, agent, this.config)
      .filter(row => [row.label, row.moduleName, row.entryId, row.description,
        ...typeof row.meta?.title === 'object' ? Object.values(row.meta.title) : [],
      ].some(value => value.toLocaleLowerCase().includes(needle)))
      .slice(0, this.config.candidateLimit))
  }

  /**
   * Resolve selected identities against the current Agent, without candidate pagination.
   * @param agent - target Agent entering the request.
   * @param ids - validated stable identities from direct user text.
   * @returns current summaries, in first-reference order.
   * @throws RemoteError when any referenced owner has no currently visible tools.
   */
  resolveReferences(agent: Agent, ids: readonly PluginInstanceId[]): PluginCapabilityCandidate[] {
    const rows = new Map(readPluginCapabilities(this.ctx, agent, this.config).map(row => [row.id, row]))
    return [...new Set(ids)].map((id) => {
      const row = rows.get(id)
      if (row === undefined) {
        throw new RemoteError('gateway/bad-request', `Referenced plugin is unavailable in this session: ${id}`, {})
      }
      return row
    })
  }
}

export default PluginInventoryGateway

/** Read current Loader entries and optional preset compositions.
 * @param ctx Context with the Loader service.
 * @returns Current inventory with optional display metadata and no separate runtime cache.
 */
export async function readPluginInventory(ctx: Context): Promise<PluginInventorySnapshot> {
  const entries: PluginInventoryEntry[] = []
  const packages = ctx.get('pluginPackages')
  for (const entry of ctx.loader.entries()) {
    if (entry.options.group) continue
    const base = entry.parent.tree.ctx.baseUrl
    const meta = base === undefined ? undefined : packages?.metaOf(entry.options.name, base)
    entries.push({
      entryId: pluginEntryId(entry.id),
      moduleName: entry.options.name,
      enabled: !entry.disabled,
      fiberPhase: entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state],
      ...meta === undefined ? {} : { meta },
    })
  }
  const presets = ctx.get('agentPresets')
  const management = ctx.get('pluginManager') === undefined ? {} : { managementAvailable: true }
  if (presets === undefined) return { entries, ...management }
  const agentPresets: AgentPresetPluginGroup[] = (await presets.compositionInventory()).map(
    composition => ({
      ...composition,
      rows: composition.rows.map(({ fiberState, ...row }) => {
        const meta = ctx.baseUrl === undefined ? undefined : packages?.metaOf(row.moduleName, ctx.baseUrl)
        return {
          ...row,
          fiberPhase: fiberState === undefined ? null : FIBER_PHASE[fiberState],
          ...meta === undefined ? {} : { meta },
        }
      }),
    }),
  )
  return { entries, agentPresets, ...management }
}
