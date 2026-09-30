/** Installed release version in General Settings for Web and Desktop. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsRootInjected } from './shell-contract.ts'
import css from './CurrentVersionRow.module.css'

/**
 * Render the version embedded by the client build; partial builds without metadata omit the row.
 * @param props - runtime share and localized copy.
 * @returns the current release label, or nothing when build metadata is absent.
 */
export function CurrentVersionRow({ t, desktop, useDesktopUpdate, openDesktopUpdate }: PropsRuntime<'settings.general.item'> & PropsLocale<'settings'>
  & Partial<Pick<InjectFace<SettingsRootInjected>, 'useDesktopUpdate' | 'openDesktopUpdate'>> & { desktop?: boolean }) {
  const version = process.env.DSH_CLIENT_VERSION
  const state = useDesktopUpdate?.(value => value)
  if (version === undefined) return null
  const busy = state?.opening === true || (state?.presentation !== undefined
    && ['checking', 'downloading', 'verifying', 'installing'].includes(state.presentation.phase))
  return <div className={css.row}>
    <div>
      {desktop && <div className={css.title}>{t('general.systemUpdate')}</div>}
      <div>{t('general.currentVersion', { version })}</div>
    </div>
    {desktop && <Button disabled={busy} onClick={openDesktopUpdate}>
      {busy ? t('desktop.update.checking') : t('general.checkUpdates')}
    </Button>}
  </div>
}
