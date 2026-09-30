/** Current-session plugin capabilities, using the Host-owned stable reference protocol. */
import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { parsePluginReferenceText } from '@deepseek-ai/dsh-host-plugin-inventory/reference'
import type {} from '@deepseek-ai/dsh-api-remotes/client'

/**
 * Create the plugin source; installed modules without current capabilities never appear.
 * @param ctx - plugin-scoped Client context.
 * @param sessions - retained session service.
 * @param section - localized candidate group title.
 * @returns a source whose persisted text is interpreted again by Host admission.
 */
export function pluginReferenceSource(ctx: Context, sessions: ISessions, section: () => string): InputTriggerSource {
  return {
    trigger: '@',
    name: 'plugin-reference',
    order: 1,
    showGroupTitle: false,
    async candidates(session, { query, drilled, signal }) {
      if (drilled) return []
      if (sessions.binding(session.sessionId) === undefined) return []
      return sessions.using(session.sessionId, { source: 'referenceCandidates', signal }, async (reference) => {
        signal.throwIfAborted()
        const snapshot = reference.binding.session.getSnapshot()
        if (snapshot.openState !== 'open') throw snapshot.openError ?? new Error('Plugin references require an open session')
        const result = await ctx.remote.pluginInventory.candidates(session.sessionId, query, signal)
        signal.throwIfAborted()
        if (!result.ok) throw result.error
        return result.value.map(candidate => ({
          name: candidate.label,
          description: [candidate.moduleName, candidate.entryId, candidate.description].filter(Boolean).join(' · '),
          section: section(),
          category: 'plugin' as const,
          value: candidate.mention,
        }))
      })
    },
    onPick({ candidate }) {
      if (candidate.value === undefined) return undefined
      const parsed = parsePluginReferenceText(candidate.value)
      if (parsed.references.length !== 1 || parsed.text !== '') return undefined
      return { insert: {
        source: 'plugin-reference', ref: candidate.value, label: candidate.name, clipboardText: candidate.value,
      } }
    },
    subscribeCandidates(_session, listener) {
      const offCapabilities = ctx.remote.$on('plugin-capabilities/changed', listener)
      const offPreset = ctx.remote.$on('agent-preset/selected', listener)
      const offReset = ctx.on('connection/reset', listener)
      return () => { offCapabilities(); offPreset(); offReset() }
    },
    codec: {
      clipboardText: ref => ref,
      serialize: (ref, signal) => {
        signal.throwIfAborted()
        parsePluginReferenceText(ref)
        return Promise.resolve(ref)
      },
    },
  }
}
