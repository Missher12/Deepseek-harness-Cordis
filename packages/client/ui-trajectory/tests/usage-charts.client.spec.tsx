// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { TrajectoryUsageCharts } from '../src/client/TrajectoryUsageCharts.tsx'
import type { TrajectoryRequestNumber } from '../src/client/TrajectoryTable.tsx'
import { en } from '../src/client/locales.ts'
import { t } from './locale.client.ts'

afterEach(cleanup)

it('includes disjoint input buckets and counts reasoning only within output', () => {
  const usage = { input: 10, cacheRead: 20, cacheWrite: 5, output: 8, reasoning: 3 }
  const { container } = render(<TrajectoryUsageCharts t={t} hasOlder={false} requests={[
    { number: 1, turn: 1, step: 1, group: 'step', usage, cumulativeUsage: usage },
  ]} />)
  expect(screen.getByRole('button', { name: 'Request 1 · Input 35 tok · Output 8 tok' })).toBeTruthy()
  expect(container.querySelector('summary')?.textContent).toContain('43 tok')
  expect(screen.getByText('Includes 20 tok cache reads')).toBeTruthy()
})

it('keeps unreported requests distinct from zero and leaves gaps in the cumulative line', () => {
  const { container } = render(<TrajectoryUsageCharts t={t} hasOlder requests={[
    { number: 1, turn: 1, step: 1, group: 'step', usage: { input: 0, output: 0 }, cumulativeUsage: { input: 0, output: 0 } },
    { number: 2, turn: 1, step: 2, group: 'step', cumulativeUsage: { input: 0, output: 0 } },
    { number: 3, turn: 1, step: 3, group: 'step', usage: { output: 4 }, cumulativeUsage: { input: 0, output: 4 } },
  ]} />)
  expect(screen.getByRole('button', { name: 'Request 1 · Input 0 tok · Output 0 tok' })).toBeTruthy()
  const missing = screen.getByRole('button', { name: 'Request 2 · Input Not recorded · Output Not recorded' })
  fireEvent.click(missing)
  expect(missing.getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByText(en['charts.partialScope'])).toBeTruthy()
  expect([...container.querySelectorAll('polyline')].filter(line => line.getAttribute('points') !== '').length).toBe(2)
})

it('bounds chart rows while retaining resident cumulative totals including compaction', () => {
  const requests: TrajectoryRequestNumber[] = Array.from({ length: 30 }, (_, index) => ({
    number: index + 1, turn: null, step: 0, purpose: 'compaction', seq: index,
    group: 'compaction', usage: { output: 2 }, cumulativeUsage: { output: (index + 1) * 2 },
  }))
  const { container, rerender } = render(<TrajectoryUsageCharts t={t} hasOlder={false} requests={requests} />)
  expect(screen.getAllByRole('button')).toHaveLength(24)
  expect(container.querySelector('summary')?.textContent).toContain('60 tok')
  expect(screen.getByRole('button', { name: 'Request 30 · Input Not recorded · Output 2 tok' }).getAttribute('aria-pressed')).toBe('true')
  rerender(<TrajectoryUsageCharts t={t} hasOlder={false} requests={[]} />)
  expect(screen.queryAllByRole('button')).toHaveLength(0)
  expect(container.querySelector('summary')?.textContent).toContain('Not recorded')
})
