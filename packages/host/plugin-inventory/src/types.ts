import type { Branded } from '@deepseek-ai/dsh-brand'
import type { PluginLocalizedMeta } from '@deepseek-ai/dsh-package-manifest'

/** Stable Loader-tree identity of one configured plugin entry. */
export type PluginEntryId = Branded<'PluginEntryId'>

/** Stable module, Loader entry and composition identity; never a display label. */
export type PluginInstanceId = Branded<'PluginInstanceId'>

/** Stable tool identity within one plugin instance. */
export type PluginCapabilityId = Branded<'PluginCapabilityId'>

/** One currently visible tool; execution still applies guards and approval. */
export interface PluginToolCapability {
  readonly id: PluginCapabilityId
  readonly name: string
  readonly description: string
  readonly invocation: 'native' | 'ptc' | 'both'
}

/** One callable plugin instance in the requesting Agent's current composition. */
export interface PluginCapabilityCandidate {
  readonly id: PluginInstanceId
  readonly label: string
  readonly description: string
  readonly mention: string
  readonly moduleName: string
  readonly entryId: PluginEntryId
  readonly presetId?: string
  readonly meta?: PluginLocalizedMeta
  readonly capabilities: readonly PluginToolCapability[]
  /** Total visible tools, including any omitted from this bounded projection. */
  readonly capabilityCount: number
}

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /**
     * Durable attribution only; replay preserves the recorded guidance without this producer.
     * @persistenceAttribution
     */
    'plugin-reference': {
      kind: 'plugin-reference'
      form: 'instructions'
      version: 1
      instances: readonly PluginInstanceId[]
    }
  }
}

/** Bounds on completion results and model-facing capability summaries. */
export interface CapabilityCatalogConfig {
  /** Maximum plugin candidates returned by one completion query. */
  candidateLimit?: number
  /** Maximum tool summaries per plugin; capabilityCount retains the visible total. */
  toolLimit?: number
  /** Maximum characters in each plugin or tool description. */
  descriptionMaxChars?: number
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * Invalidate callable-plugin snapshots after registry or Loader lifecycle changes.
     * This notification carries no capability data; consumers re-query their Agent.
     * @mode emit
     */
    'plugin-capabilities/changed'(): void
  }
}

/** Lifecycle state of an entry's root Fiber, or null when it has no live root Fiber. */
export type PluginFiberPhase =
  | 'pending'
  | 'loading'
  | 'active'
  | 'failed'
  | 'unloading'
  | null

/** One non-group Loader entry exposed to trusted clients. */
export interface PluginInventoryEntry {
  readonly entryId: PluginEntryId
  /** Exact module specifier imported by the Loader entry. */
  readonly moduleName: string
  /** Local package display metadata, independent of whether the entry is enabled. */
  readonly meta?: PluginLocalizedMeta
  /** Effective Loader enablement, including disabled ancestor groups. */
  readonly enabled: boolean
  readonly fiberPhase: PluginFiberPhase
}

/** Effective enablement of one preset composition row. */
export type PresetPluginEnablement = boolean | 'conditional'

/** One plugin row an agent preset's composition names. */
export interface AgentPresetPluginRow {
  /** Composition row id, or null when the row declares none. */
  readonly entryId: string | null
  /** Module specifier the row names. */
  readonly moduleName: string
  /** Local package display metadata, independent of whether the preset is mounted. */
  readonly meta?: PluginLocalizedMeta
  /**
   * Effective enablement, including disabled ancestor groups. `'conditional'`
   * marks a `!!js` disabled expression on a composition no session has
   * mounted, which only a Loader context can decide.
   */
  readonly enabled: PresetPluginEnablement
  /** The row's own `!!js` disabled expression, when it carries one. */
  readonly condition?: string
  /** Root-fiber phase when the composition is live; null otherwise. */
  readonly fiberPhase: PluginFiberPhase
}

/** One agent preset's identity and flattened composition in the inventory. */
export interface AgentPresetPluginGroup {
  /** Stable preset id. */
  readonly id: string
  /** Display name the preset published; a reader falls back to the id. */
  readonly name?: string
  /** Whether a session naming no preset composes this one. */
  readonly isDefault: boolean
  /** Why this preset's composition cannot be read; absent when rows answer. */
  readonly broken?: string
  /** Plugin rows in composition order; empty when the preset is broken. */
  readonly rows: readonly AgentPresetPluginRow[]
}

/** Point-in-time inventory returned by the plugin inventory Remote. */
export interface PluginInventorySnapshot {
  /** Whether this Host exposes persistent current-profile management. */
  readonly managementAvailable?: boolean
  readonly entries: readonly PluginInventoryEntry[]
  /**
   * Per-preset compositions, present only when an agent-preset roster is
   * composed in this deployment.
   */
  readonly agentPresets?: readonly AgentPresetPluginGroup[]
}
