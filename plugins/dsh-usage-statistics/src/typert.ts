/** Plugin-owned Host invocation manifest, discovered by the Harness Typert loader. */
import { TYPERT_REMOTE } from './wire.ts'

export const TYPERT = {
  package: TYPERT_REMOTE.package,
  face: 'host',
  schemas: [],
  invocations: TYPERT_REMOTE.descriptors,
  model: {
    services: [{
      key: 'usageStatistics',
      exportName: 'UsageStatistics',
      summary: 'Read-only local usage statistics.',
      tags: [],
      members: [{kind: 'method', name: 'snapshot', signature: 'snapshot(): Promise<UsageInsightsSnapshot>'}],
      types: [],
    }],
    events: [],
    objects: [],
  },
}
