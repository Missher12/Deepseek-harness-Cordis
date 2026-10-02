import { useRef, useState, type CSSProperties } from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { UsageInsightsSectionProps } from './UsageInsightsSection.tsx'
import { setParticleColor } from './particle-color.ts'
import css from './UsageInsightsSection.module.css'

const presets = [
  { color: '', label: 'themeColor' },
  { color: '#8b6ccf', label: 'violetColor' },
  { color: '#447fcb', label: 'blueColor' },
  { color: '#369f97', label: 'tealColor' },
  { color: '#c69749', label: 'amberColor' },
  { color: '#ca758f', label: 'roseColor' },
] as const

/** A compact native menu; the existing renderer-local preference remains the source of truth. */
export function ParticleColorPicker({ color, t }: { color: string; t: UsageInsightsSectionProps['t'] }) {
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const selected = presets.find(preset => preset.color === color)
  const swatch = (value: string) => (
    <span className={css.paletteSwatch} style={{ '--usage-swatch': value || 'var(--dsw-alias-state-business-primary)' } as CSSProperties} aria-hidden="true">
      <i /><i /><i />
    </span>
  )
  return (
    <div className={css.paletteControl}>
      <Menu
        open={open} onClose={() => { setOpen(false) }} portal compact autoFocus
        selectedId={selected?.label ?? 'customColor'}
        listClassName={css.paletteMenu}
        anchor={(
          <button type="button" className={css.paletteTrigger} aria-label={t('particleColor')}
            aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(value => !value) }}>
            {swatch(color)}
            <span>{t('colorMenu')}</span>
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        items={[
          ...presets.map(preset => ({ id: preset.label, label: t(preset.label), icon: swatch(preset.color) })),
          { type: 'separator', id: 'custom-separator' },
          { id: 'customColor', label: t('customColor'), icon: swatch(color) },
        ]}
        onSelect={id => {
          setOpen(false)
          if (id === 'customColor') input.current?.click()
          else setParticleColor(presets.find(preset => preset.label === id)!.color)
        }}
      />
      <input ref={input} className={css.nativeColorInput} type="color" tabIndex={-1}
        aria-label={t('customColor')} value={color || '#4d6bfe'}
        onChange={event => { setParticleColor(event.currentTarget.value) }} />
    </div>
  )
}
