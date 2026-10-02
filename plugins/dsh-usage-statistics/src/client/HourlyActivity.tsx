import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { usageDateKey } from '../calendar.ts'
import type { UsageInsightsSnapshot } from '../types.ts'
import type { UsageInsightsSectionProps } from './UsageInsightsSection.tsx'
import { formatCompactNumber } from './format.ts'
import css from './UsageInsightsSection.module.css'

const clock = (hour: number): string => `${String(hour).padStart(2, '0')}:00`

/** Today's actual clock-hour usage; one keyboard stop opens a 24-hour arrow-key walk. */
export function HourlyActivity({ snapshot, locale, t, refresh, refreshing }: {
  snapshot: UsageInsightsSnapshot
  locale: string
  t: UsageInsightsSectionProps['t']
  refresh: () => void
  refreshing: boolean
}) {
  const { date, tokens } = snapshot.hourly
  const total = tokens.reduce((sum, value) => sum + value, 0)
  const maximum = Math.max(...tokens)
  const peak = tokens.indexOf(maximum)
  const [focused, setFocused] = useState(0)
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const exact = new Intl.NumberFormat(locale)
  const dateLabel = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`))
  const isToday = date === usageDateKey(Date.now(), snapshot.timeZone)
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, hour: number): void => {
    const next = event.key === 'ArrowRight' ? (hour + 1) % 24
      : event.key === 'ArrowLeft' ? (hour + 23) % 24
        : event.key === 'Home' ? 0 : event.key === 'End' ? 23 : undefined
    if (next === undefined) return
    event.preventDefault()
    setFocused(next)
    refs.current[next]?.focus()
  }
  return (
    <section className={css.hourly} aria-label={t('hourlyActivity')}>
      <div className={css.hourlyHeader}>
        <div className={css.hourlyTitle}>
          <h3>{t('hourlyActivity')}</h3>
          <span className={css.hourlyDate}>{isToday ? `${t('today')} · ` : ''}{dateLabel}</span>
        </div>
        <div className={css.hourlyMeta}>
          <span>{t('hourlyTotal')} <strong title={`${exact.format(total)} Token`}>{formatCompactNumber(total, locale)}</strong> <span className={css.tokenUnit}>Token</span></span>
          <button type="button" className={css.refreshHourly} disabled={refreshing} aria-label={t('refresh')}
            title={t('refresh')} onClick={refresh}>
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true"><path d="M12.8 6A5 5 0 1 0 13 9M13 2v4H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      <div className={css.hourlyPlot}>
        <div className={css.hourlyGuide} aria-hidden="true"><span>{formatCompactNumber(maximum, locale)}</span><span>0</span></div>
        <div className={css.hourlyBars} role="group" aria-label={`${date} · ${snapshot.timeZone}`}>
          {tokens.map((value, hour) => (
            <Tooltip key={hour} label={`${clock(hour)}–${clock(hour + 1)} · ${exact.format(value)} Token`} side="top" portal openOnClick>
              <button type="button" ref={node => { refs.current[hour] = node }} className={css.hourColumn}
                data-usage-hour={hour} data-hour-tokens={value} data-peak={value > 0 && value === maximum || undefined}
                tabIndex={focused === hour ? 0 : -1} onFocus={() => { setFocused(hour) }}
                onKeyDown={event => { navigate(event, hour) }}
                aria-label={`${clock(hour)}–${clock(hour + 1)} · ${exact.format(value)} Token`}>
                <span className={css.hourBar} data-empty={value === 0 || undefined}
                  style={{ height: `${maximum === 0 ? 0 : value / maximum * 100}%` } as CSSProperties} />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      <div className={css.hourlyAxis} aria-hidden="true">
        {tokens.map((_, hour) => <span key={hour}>{hour % 3 === 0 || hour === 23 ? String(hour).padStart(2, '0') : ''}</span>)}
      </div>
      <div className={css.hourlyFooter}>
        <span>{maximum === 0 ? t('hourlyEmpty') : `${t('hourlyPeak')} ${clock(peak)}–${clock(peak + 1)} · ${exact.format(maximum)} Token`}</span>
        <span>{snapshot.timeZone}</span>
      </div>
    </section>
  )
}
