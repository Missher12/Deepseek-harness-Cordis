/** Reported request usage from the resident trajectory snapshot. */
import { useState, type CSSProperties } from 'react'
import clsx from 'clsx'
import type { TrajectoryRequestNumber, TrajectoryUsage } from './TrajectoryTable.tsx'
import type { TrajectoryTranslate } from './locales.ts'
import css from './TrajectoryUsageCharts.module.css'

function input(usage: TrajectoryUsage | undefined): number | undefined {
  if (usage?.input === undefined && usage?.cacheRead === undefined && usage?.cacheWrite === undefined) return undefined
  return (usage.input ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0)
}

function total(usage: TrajectoryUsage | undefined): number | undefined {
  const incoming = input(usage)
  if (incoming === undefined && usage?.output === undefined) return undefined
  // Output already includes reasoning; adding the reasoning bucket counts it twice.
  return (incoming ?? 0) + (usage?.output ?? 0)
}

/** Render bounded, selectable usage charts without reading or changing session events. */
export function TrajectoryUsageCharts({ requests, hasOlder, t }: {
  requests: readonly TrajectoryRequestNumber[]
  hasOlder: boolean
  t: TrajectoryTranslate
}) {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const recent = requests.slice(-24)
  const selected = recent.find(request => request.number === selectedNumber) ?? recent.at(-1)
  const cumulative = requests.at(-1)?.cumulativeUsage
  const format = (value: number | undefined) => value === undefined
    ? t('timing.notRecorded') : t('unit.tokens', { value })
  const label = (request: TrajectoryRequestNumber) => t('charts.request', {
    number: request.number,
    input: format(input(request.usage)),
    output: format(request.usage?.output),
  })
  const maximum = Math.max(1, ...recent.flatMap(request => [input(request.usage) ?? 0, request.usage?.output ?? 0]))
  const cumulativeMaximum = Math.max(1, total(cumulative) ?? 0)
  // Missing reports break the line rather than inventing a zero or a measured plateau.
  const segments: string[][] = [[]]
  for (const [index, request] of recent.entries()) {
    const value = total(request.cumulativeUsage)
    if (total(request.usage) === undefined || value === undefined) {
      segments.push([])
    } else {
      segments.at(-1)?.push(`${8 + index * 284 / Math.max(1, recent.length - 1)},${68 - value / cumulativeMaximum * 60}`)
    }
  }
  return <details className={css.root} open>
    <summary className={css.summary}>{t('charts.title')} <span>{format(total(cumulative))}</span></summary>
    <div className={css.charts}>
      <section className={css.panel} aria-label={t('charts.requests')}>
        <div className={css.heading}>
          <span>{t('charts.requests')}</span>
          <span className={css.legend}><i className={css.input} />{t('usage.input')}<i className={css.output} />{t('usage.output')}</span>
        </div>
        <div className={css.bars}>
          {recent.map(request => <button key={request.number} type="button"
            className={clsx(css.bar, request.number === selected?.number && css.selected)}
            aria-label={label(request)} title={label(request)} aria-pressed={request.number === selected?.number}
            onClick={() => { setSelectedNumber(request.number) }}>
            <span className={css.columns}>
              <i className={css.input} style={{ '--usage-height': `${(input(request.usage) ?? 0) / maximum * 100}%` } as CSSProperties} />
              <i className={css.output} style={{ '--usage-height': `${(request.usage?.output ?? 0) / maximum * 100}%` } as CSSProperties} />
              {total(request.usage) === undefined ? <span className={css.missing}>—</span> : null}
            </span>
            <span className={css.number}>{request.number}</span>
          </button>)}
          {recent.length === 0 ? <p className={css.empty}>{t('usage.notReported')}</p> : null}
        </div>
        <p className={css.caption}>{selected === undefined ? t('usage.notReported') : label(selected)}</p>
      </section>
      <section className={css.panel} aria-label={t('charts.cumulative')}>
        <div className={css.heading}><span>{t('charts.cumulative')}</span><span>{format(total(cumulative))}</span></div>
        <svg className={css.lineChart} viewBox="0 0 300 76" role="img" aria-label={t('charts.cumulative')}>
          <line x1="8" x2="292" y1="68" y2="68" className={css.axis} />
          {segments.map((points, index) => <g key={index}>
            <polyline points={points.join(' ')} className={css.line} />
            {points.map(point => <circle key={point} cx={point.split(',')[0]} cy={point.split(',')[1]} r="2" className={css.dot} />)}
          </g>)}
        </svg>
        <p className={css.caption}>{t('charts.cache', { value: format(cumulative?.cacheRead) })}</p>
      </section>
    </div>
    <p className={css.scope}>{t(hasOlder ? 'charts.partialScope' : 'charts.scope')}</p>
  </details>
}
