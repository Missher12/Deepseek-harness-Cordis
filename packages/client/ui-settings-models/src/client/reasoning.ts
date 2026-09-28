/** Editable pi-ai capability declarations; request defaults stay outside this value. */
export type ReasoningDeclaration = false | Readonly<Record<string, string | null>> | undefined

/** pi-ai's canonical order, used only by its declaration editor. */
export const reasoningLevels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const

/**
 * Read a declaration without coercing malformed values into an inherited capability.
 * @param value - Draft capability declaration.
 * @returns Entries containing a string wire value or an explicit null.
 */
export function reasoningMap(value: unknown): Record<string, string | null> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string | null] =>
    typeof entry[1] === 'string' || entry[1] === null))
}

/**
 * Validate a draft before a settings write; the Host repeats semantic validation.
 * @param value - Draft capability declaration.
 * @returns Whether the declaration inherits, disables, or supplies a valid capability map.
 */
export function validReasoning(value: unknown): boolean {
  if (value === undefined || value === false) return true
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entries = Object.entries(value)
  return entries.some(([id]) => id !== 'off') && entries.every(([id, wire]) =>
    reasoningLevels.some(level => level === id)
    && (typeof wire === 'string' ? wire.trim().length > 0 : id === 'off' && wire === null))
}

/**
 * Validate capability declarations without discarding unrelated provider fields.
 * @param profile - Provider draft containing model declarations and overrides.
 * @returns Whether every model capability declaration is valid.
 */
export function validProviderReasoning(profile: unknown): boolean {
  if (typeof profile !== 'object' || profile === null || Array.isArray(profile)) return true
  const { models, modelOverrides } = profile as Record<string, unknown>
  const rows: unknown[] = [
    ...Array.isArray(models) ? models as unknown[] : [],
    ...typeof modelOverrides === 'object' && modelOverrides !== null
      ? Object.values(modelOverrides as Record<string, unknown>) : [],
  ]
  return rows.every(row => typeof row !== 'object' || row === null
    || validReasoning((row as Record<string, unknown>)['reasoningEfforts']))
}
