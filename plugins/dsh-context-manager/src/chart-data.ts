/** Read-only chart values. Content estimates never borrow provider usage totals. */
import type { Category, Inspection } from './inspector-types.ts'

export const contextGroups = [
  { id: 'summary', categories: ['summary'] },
  { id: 'tool', categories: ['tool'] },
  { id: 'message', categories: ['user', 'assistant'] },
  { id: 'instruction', categories: ['system', 'tools', 'inject', 'skill'] },
] as const satisfies readonly { id: string; categories: readonly Category[] }[]
export type ContextGroup = typeof contextGroups[number]['id']
export interface ChartSlice { id: ContextGroup | 'free'; value: number; share: number }

/** Tenths of a percent sum to 100 while bar widths use unrounded values. */
export function percentages(values: readonly number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return values.map(() => 0)
  const raw = values.map(value => value / total * 1000)
  const units = raw.map(Math.floor)
  const order = raw.map((value, index) => ({ index, fraction: value - units[index]! })).sort((a, b) => b.fraction - a.fraction || a.index - b.index)
  const remaining = 1000 - units.reduce((sum, value) => sum + value, 0)
  for (let i = 0; i < remaining; i++) units[order[i]!.index]!++
  return units.map(value => value / 10)
}

/** Entire-window charts use the same text estimator for all occupied segments. */
export function composition(data: Pick<Inspection, 'parts' | 'pressure'>, basis: 'content' | 'window') {
  const slices: ChartSlice[] = contextGroups.map(group => ({ id: group.id, value: data.parts.filter(part => group.categories.some(category => category === part.category)).reduce((sum, part) => sum + part.tokens, 0), share: 0 }))
  const content = slices.reduce((sum, item) => sum + item.value, 0)
  const window = data.pressure?.window ?? null
  if (content > 0 && basis === 'window' && window !== null && window > 0) slices.push({ id: 'free', value: Math.max(0, window - content), share: 0 })
  const total = slices.reduce((sum, item) => sum + item.value, 0)
  const shares = percentages(slices.map(item => item.value))
  return { content, total, window, overflow: window !== null && content > window, slices: slices.map((item, index) => ({ ...item, share: shares[index]! })) }
}

/** Disjoint usage buckets: the cached input is already part of total input. */
export function usageSlices(usage: Inspection['usage']) {
  if (usage === null) return null
  const values = [usage.uncached, usage.cacheRead, usage.cacheWrite, usage.output]
  if (values.some(value => !Number.isFinite(value) || value < 0)) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return { total, values, shares: percentages(values), hit: usage.input > 0 ? usage.cacheRead / usage.input * 100 : null }
}
