/** Mount a private Remote namespace and one removable settings section. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { UsageInsightsSnapshot } from '../types.ts'
import { TYPERT_REMOTE } from '../wire.ts'
import { UsageInsightsSection } from './UsageInsightsSection.tsx'
import { en, zh, type UsageInsightsLocaleKey } from './locales.ts'
import styles from './UsageInsightsSection.module.css?inline'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'usage.statistics': UsageInsightsLocaleKey
  }
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespaceMap {
    usageStatistics: {snapshot(): Promise<RemoteResult<UsageInsightsSnapshot>>}
  }
}

export const inject = ['slots', 'locale', 'remote']

/** Register the plugin's data transport, dictionaries, styles and settings page. */
export async function apply(ctx: ClientContext): Promise<void> {
  const unmount = await ctx.remote.$mount(TYPERT_REMOTE)
  ctx.effect(() => unmount, 'usage-statistics: remote')
  ctx.effect(() => ctx.locale.register('usage.statistics', {zh, en}), 'usage-statistics: locale')
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = '@missher/dsh-usage-statistics'
    style.textContent = styles
    document.head.append(style)
    return () => style.remove()
  }, 'usage-statistics: styles')
  ctx.inject(['remote.usageStatistics'], (scope) => {
    const t = scope.locale.bind('usage.statistics')
    const load = async (): Promise<UsageInsightsSnapshot> => {
      const result = await scope.remote.usageStatistics.snapshot()
      if (!result.ok) throw new Error(`Usage statistics could not be loaded: ${result.error.code}`)
      return result.value
    }
    scope.slots.inject('settings.section', () => scope.slots.register({
      name: 'settings.section',
      id: 'usage',
      order: 12,
      label: () => t('section'),
      locale: 'usage.statistics',
      inject: () => ({load, locale: scope.locale.getLocale().active}),
    }, UsageInsightsSection))
  })
}
