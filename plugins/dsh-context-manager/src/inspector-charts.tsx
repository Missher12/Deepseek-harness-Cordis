import { useState } from 'react'
import type { Inspection, PressurePoint } from './inspector-types.ts'

const number = (value: number | null | undefined) => value == null ? '—' : Math.round(value).toLocaleString()
const kind = (point: PressurePoint) => point.kind === 'reply' ? '回复后' : point.kind === 'replace' ? '内容替换后' : '截面末尾'

/** A host-projection trend, distinct from provider input usage and cumulative spend. */
export function PressureTrend({ data }: { data: Inspection }) {
  const [selected, setSelected] = useState<number | null>(null)
  const points = data.pressureHistory ?? []
  const known = points.filter(point => point.tokens !== null)
  const maximum = Math.max(1, ...known.map(point => point.tokens!))
  const point = points.find(item => item.seq === selected) ?? points.at(-1)
  const x = (index: number) => points.length === 1 ? 320 : 10 + index / (points.length - 1) * 620
  const y = (value: number) => 120 - value / maximum * 104
  let continuous = false
  const path = points.map((item, index) => {
    if (item.tokens === null) { continuous = false; return '' }
    const command = continuous ? 'L' : 'M'
    continuous = true
    return `${command}${x(index)},${y(item.tokens)}`
  }).join(' ')
  return <article className="cmi-card cmi-pressure-trend"><div className="cmi-section-title"><h3>上下文占用趋势</h3><span className="cmi-note">宿主估算 · Token</span></div>
    <p className="cmi-note">最近 {points.length} 个关键截面，按记录顺序排列；未知值断开，内容替换以圆点标记。</p>
    {!known.length ? <div className="cmi-empty">尚无可用的上下文占用记录。</div> : <><div className="cmi-pressure-plot" role="group" aria-label="上下文占用趋势，选择截面查看数值">
      <svg viewBox="0 0 640 132" preserveAspectRatio="none" aria-hidden="true"><path className="cmi-pressure-grid" d="M10 16H630 M10 68H630 M10 120H630"/><path className="cmi-pressure-line" d={path}/></svg>
      <span className="cmi-pressure-scale">{number(maximum)}</span><span className="cmi-pressure-zero">0</span>
      {points.map((item, index) => <button key={item.seq} type="button" className="cmi-pressure-point" data-kind={item.kind} data-unknown={item.tokens === null} style={{ left: `${x(index) / 640 * 100}%`, top: `${y(item.tokens ?? 0) / 132 * 100}%` }} aria-pressed={point?.seq === item.seq} aria-label={`记录 ${item.seq}，${kind(item)}，${item.tokens === null ? '占用未知' : `约 ${number(item.tokens)} Token`}`} onClick={() => setSelected(item.seq)} onFocus={() => setSelected(item.seq)}><span/></button>)}
    </div><div className="cmi-between cmi-note cmi-pressure-range"><span>记录 {points[0]!.seq}</span><span>记录 {points.at(-1)!.seq}</span></div>
      {point && <div className="cmi-pressure-caption" aria-live="polite"><span>记录 {point.seq} · {kind(point)}</span><strong>{point.tokens === null ? '占用未知' : `≈ ${number(point.tokens)} Token`}</strong><span>{new Date(point.time).toLocaleString('zh-CN', { hour12: false })}</span></div>}
    </>}
    <details className="cmi-request-table"><summary>查看截面数值</summary><div><table><thead><tr><th>记录</th><th>阶段</th><th>估算占用</th><th>回报窗口</th></tr></thead><tbody>{points.map(item => <tr key={item.seq}><td>{item.seq}</td><td>{kind(item)}</td><td>{number(item.tokens)}</td><td>{number(item.window)}</td></tr>)}</tbody></table></div></details>
    <p className="cmi-note">用模型回报校准后续内容变化；不是每次请求的原文或账单。替换包含压缩与裁剪。</p>
  </article>
}

export function UsageComposition({ data }: { data: Inspection }) {
  const usage = data.usage
  if (!usage || usage.uncached == null || usage.cacheWrite == null) return <div className="cmi-empty">累计用量组成暂不可得。</div>
  const parts = [{ id: 'uncached', label: '未命中输入', value: usage.uncached }, { id: 'cache', label: '缓存读取', value: usage.cacheRead }, { id: 'write', label: '缓存写入', value: usage.cacheWrite }, { id: 'output', label: '输出', value: usage.output }]
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  return <div className="cmi-usage-composition" aria-label="累计 Token 用量组成">
    {total > 0 ? <div className="cmi-usage-stack" aria-hidden="true">{parts.filter(part => part.value > 0).map(part => <span key={part.id} data-usage={part.id} style={{ width: `${part.value / total * 100}%` }}/>)}</div> : <p className="cmi-note">已记录的累计用量为 0 Token</p>}
    <dl className="cmi-usage-legend">{parts.map(part => <div key={part.id}><dt><i data-usage={part.id}/>{part.label}</dt><dd>{number(part.value)}<small>{total ? `${(part.value / total * 100).toFixed(1)}%` : '—'}</small></dd></div>)}</dl>
  </div>
}
