/** Per-model capability editing, including sparse canonical-to-wire mappings. */
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ModelsKey } from './locales.ts'
import { reasoningLevels, reasoningMap, validReasoning } from './reasoning.ts'
import type { ReasoningDeclaration } from './reasoning.ts'
import styles from './ModelsSection.module.css'

interface ModelReasoningFieldsProps {
  value: unknown
  inherited?: ReasoningDeclaration
  label: string
  disabled: boolean
  t: (key: ModelsKey) => string
  onChange: (value: ReasoningDeclaration) => void
}

/** Render a declaration editor; the maximum limits the confirmed set for this draft. */
export function ModelReasoningFields({ value, inherited, label, disabled, t, onChange }: ModelReasoningFieldsProps): ReactNode {
  const mode = value === undefined ? 'inherit' : value === false ? 'disabled' : 'custom'
  const map = reasoningMap(value)
  const lastCustom = useRef<Record<string, string | null> | undefined>(undefined)
  // Keep known mappings for this edit so lowering the cap is reversible. Only
  // the filtered declaration is persisted; there is no separate maxEffort.
  const [confirmed, setConfirmed] = useState(() => reasoningMap(value))
  const supported = { ...confirmed, ...map }
  const offered = reasoningLevels.filter(level => Object.hasOwn(supported, level))
  const maximum = reasoningLevels.filter(level => Object.hasOwn(map, level)).at(-1) ?? ''
  const change = (next: Record<string, string | null>): void => {
    lastCustom.current = next
    onChange(next)
  }
  const editSupported = (next: Record<string, string | null>): void => {
    setConfirmed(next)
    const at = maximum === '' ? reasoningLevels.length : reasoningLevels.findIndex(level => level === maximum)
    change(Object.fromEntries(Object.entries(next).filter(([id]) => reasoningLevels.findIndex(level => level === id) <= at)))
  }
  return <fieldset className={styles['reasoningFields']} disabled={disabled}>
    <legend>{t('reasoningCapability')}</legend>
    <label className={styles['modelField']}>
      <span className={styles['modelFieldLabel']}>{t('reasoningMode')}</span>
      <select className={`${styles['input']} ${styles['selectInput']}`} aria-label={`${t('reasoningMode')} ${label}`} value={mode} onChange={(event) => {
        if (mode === 'custom') lastCustom.current = map
        const next = event.target.value
        if (next === 'custom') {
          const restored = lastCustom.current ?? reasoningMap(inherited)
          setConfirmed(current => ({ ...current, ...restored }))
          change(restored)
        } else onChange(next === 'inherit' ? undefined : false)
      }}>
        <option value="inherit">{t('reasoningInherit')}</option>
        <option value="disabled">{t('reasoningDisabled')}</option>
        <option value="custom">{t('reasoningCustom')}</option>
      </select>
    </label>
    <p className={styles['advancedHint']}>{t('reasoningHint')}</p>
    {mode === 'inherit' ? <p className={styles['advancedHint']}>
      {inherited === undefined ? t('reasoningUnknown') : inherited === false ? t('reasoningDisabled')
        : Object.keys(inherited).join(' / ')}
    </p> : null}
    {mode !== 'custom' ? null : <>
      <label className={styles['modelField']}>
        <span className={styles['modelFieldLabel']}>{t('reasoningMaximum')}</span>
        <select className={`${styles['input']} ${styles['selectInput']}`} aria-label={`${t('reasoningMaximum')} ${label}`} value={maximum} onChange={(event) => {
          const at = reasoningLevels.findIndex(level => level === event.target.value)
          setConfirmed(supported)
          change(Object.fromEntries(Object.entries(supported).filter(([id]) => {
            const index = reasoningLevels.findIndex(level => level === id)
            return index >= 0 && index <= at
          })))
        }}>
          {maximum === '' ? <option value="">{t('reasoningChooseLevels')}</option> : null}
          {offered.map(level => <option key={level} value={level} disabled={level === 'off'}>{level}</option>)}
        </select>
      </label>
      <details>
        <summary>{t('reasoningAdvanced')}</summary>
        {reasoningLevels.map(level => <div key={level} className={styles['reasoningLevel']}>
          <label><input type="checkbox" aria-label={`${t('reasoningSupported')} ${level} ${label}`} checked={Object.hasOwn(supported, level)} onChange={(event) => {
            const next = { ...supported }
            if (event.target.checked) next[level] = reasoningMap(inherited)[level] ?? (level === 'off' ? null : '')
            else Reflect.deleteProperty(next, level)
            editSupported(next)
          }}/>{level}</label>
          {!Object.hasOwn(supported, level) ? null : <>
            {level === 'off' ? <label><input type="checkbox" aria-label={`${t('reasoningOmit')} ${label}`} checked={supported[level] === null} onChange={(event) => {
              editSupported({ ...supported, off: event.target.checked ? null : '' })
            }}/>{t('reasoningOmit')}</label> : null}
            {supported[level] === null ? null : <input className={styles['input']} type="text" aria-label={`${t('reasoningWire')} ${level} ${label}`} value={supported[level] ?? ''} placeholder={t('reasoningWire')} onChange={(event) => {
              editSupported({ ...supported, [level]: event.target.value })
            }}/>}
          </>}
        </div>)}
      </details>
      {validReasoning(value) ? null : <p role="alert" className={styles['error']}>{t('reasoningInvalid')}</p>}
    </>}
  </fieldset>
}
