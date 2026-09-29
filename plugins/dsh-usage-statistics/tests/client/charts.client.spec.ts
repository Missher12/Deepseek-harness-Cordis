import { describe, expect, it } from 'vitest'
import type { UsageActivityDay } from '../../src/types.ts'
import { buildParticleGrid } from '../../src/client/charts.ts'

function day(index: number, tokens: number): UsageActivityDay {
  return {
    date: new Date(Date.UTC(2026, 0, 4 + index)).toISOString().slice(0, 10),
    humanMessages: tokens > 0 ? 1 : 0,
    tokens,
    toolCalls: 0,
    level: tokens > 0 ? 1 : 0,
  }
}

describe('aggregate particle intensity', () => {
  it('separates daily color shades without changing particle positions or values', () => {
    const daily = [0, 6_000, 12_000, 18_000, 24_000, 30_000, 0]
      .map((tokens, index) => ({ ...day(index, tokens), level: tokens > 0 ? 4 as const : 0 as const }))
    const particles = buildParticleGrid(daily, 'daily').flat()
    expect(particles.map(item => item.level)).toEqual([0, 1, 2, 3, 4, 5, 0])
    expect(particles.map(item => [item.date, item.tokens])).toEqual(daily.map(item => [item.date, item.tokens]))
  })

  const activity = [
    ...Array.from({ length: 7 }, (_, index) => day(index, index === 0 ? 10 : 0)),
    ...Array.from({ length: 7 }, (_, index) => day(index + 7, index === 0 ? 990 : 0)),
  ]

  it('uses lighter filled particles for lower-volume weeks', () => {
    const weeks = buildParticleGrid(activity, 'weekly')
    expect(new Set(weeks[0]?.map(item => item.level).filter(level => level > 0))).toEqual(new Set([1]))
    expect(new Set(weeks[1]?.map(item => item.level).filter(level => level > 0))).toEqual(new Set([5]))
  })

  it('grades cumulative filled particles as the running total grows', () => {
    const weeks = buildParticleGrid(activity, 'cumulative')
    expect(new Set(weeks[0]?.map(item => item.level).filter(level => level > 0))).toEqual(new Set([1]))
    expect(new Set(weeks[1]?.map(item => item.level).filter(level => level > 0))).toEqual(new Set([5]))
  })
})
