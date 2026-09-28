import {describe, expect, it} from 'vitest'
import {validateTypertManifest} from '@deepseek-ai/dsh-typert-loader'
import {TYPERT} from '../../src/typert.ts'
import {TYPERT_REMOTE} from '../../src/wire.ts'
import {aggregateUsageRows} from '../../src/aggregate.ts'

describe('independent statistics Remote', () => {
  it('is accepted by the actual Host loader and shares the Client invocation', () => {
    const parsed = validateTypertManifest('@missher/dsh-usage-statistics', TYPERT)
    expect(parsed.invocations).toEqual(TYPERT_REMOTE.descriptors)
    expect(parsed.invocations?.[0]?.namespace).toBe('usageStatistics')
  })

  it('carries the full empty-state result and strips unrelated data from the wire', () => {
    const snapshot = aggregateUsageRows([], {now: Date.now(), timeZone: 'UTC', omittedSessions: 0})
    const codec = TYPERT_REMOTE.descriptors[0].result.create()
    expect(codec.parse({...snapshot, messageBody: 'not part of a statistics response'})).toEqual(snapshot)
    expect(() => codec.parse({...snapshot, activity: 'invalid'})).toThrow()
  })
})
