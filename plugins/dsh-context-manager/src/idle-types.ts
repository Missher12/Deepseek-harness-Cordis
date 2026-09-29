/** Process-local idle maintenance status; observing it never activates an Agent. */
export interface IdleStatus {
  status: 'off' | 'waiting' | 'scheduled' | 'checking' | 'compacting' | 'completed' | 'skipped' | 'cancelled' | 'failed'
  dueAt: number | null
  message: string
  beforeTokens?: number
  afterTokens?: number
}
