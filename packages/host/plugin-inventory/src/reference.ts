/** Browser-safe canonical plugin-reference codec. */
import type { PluginInstanceId } from './types.ts'

const PREFIX = '@{dsh-plugin:'
const VERSION = 'v1:'
// Protocol bounds prevent an opaque identity from becoming an unbounded payload.
const MAX_ID_LENGTH = 4096

/** Malformed, noncanonical or unsupported plugin reference text. */
export class PluginReferenceSyntaxError extends Error {
  override name = 'PluginReferenceSyntaxError'
}

type PluginIdentity = [string, string, 'host' | ['preset', string]]

/** Validate the identity tuple owned by the Loader projection. */
function isIdentity(value: unknown): value is PluginIdentity {
  if (!Array.isArray(value) || value.length !== 3) return false
  const tuple: unknown[] = value
  const [moduleName, entryId, scope] = tuple
  if (typeof moduleName !== 'string' || !moduleName || typeof entryId !== 'string' || !entryId) return false
  return scope === 'host' || (Array.isArray(scope) && scope.length === 2
    && scope[0] === 'preset'
    && typeof scope[1] === 'string' && scope[1].length > 0)
}

/**
 * Validate and brand a canonical Loader identity at a text boundary.
 * @param value - serialized module, entry and scope tuple.
 * @returns the validated opaque identity.
 * @throws PluginReferenceSyntaxError for malformed or noncanonical identity data.
 */
export function pluginInstanceId(value: string): PluginInstanceId {
  decodeIdentity(value)
  return value as PluginInstanceId
}

/** Parse the canonical tuple shared by branding and display-only projection. */
function decodeIdentity(value: string): PluginIdentity {
  if (value.length > MAX_ID_LENGTH) throw new PluginReferenceSyntaxError('Invalid plugin reference identity')
  let decoded: unknown
  try { decoded = JSON.parse(value) } catch {
    throw new PluginReferenceSyntaxError('Invalid plugin reference identity')
  }
  if (!isIdentity(decoded) || JSON.stringify(decoded) !== value) {
    throw new PluginReferenceSyntaxError('Invalid plugin reference identity')
  }
  return decoded
}

/**
 * Describe a validated reference when live display metadata is unavailable.
 * This projection establishes neither availability nor permission.
 * @param id - opaque reference identity from the Host or canonical parser.
 * @returns module and entry labels for historical text presentation.
 * @throws PluginReferenceSyntaxError for an invalid identity.
 */
export function describePluginReference(id: PluginInstanceId): { moduleName: string; entryId: string } {
  const [moduleName, entryId] = decodeIdentity(id)
  return { moduleName, entryId }
}

/**
 * Produce the same versioned text for insertion, clipboard, drafts and submission.
 * @param id - opaque identity returned by the Host catalog.
 * @returns canonical reference text without a display-name dependency.
 */
export function formatPluginReferenceMention(id: PluginInstanceId): string {
  return `${PREFIX}${VERSION}${encodeURIComponent(id)}}`
}

/**
 * Remove canonical mentions and recover their identities in occurrence order.
 * Ordinary paths and other reference schemes are preserved byte-for-byte.
 * @param text - direct user text, including text restored without editor occurrences.
 * @returns remaining text and validated identities, retaining repeated occurrences.
 * @throws PluginReferenceSyntaxError for any malformed or unsupported plugin marker.
 */
export function parsePluginReferenceText(text: string): { text: string; references: readonly PluginInstanceId[] } {
  const references: PluginInstanceId[] = []
  let result = ''
  let cursor = 0
  for (;;) {
    const start = text.indexOf(PREFIX, cursor)
    if (start < 0) return { text: result + text.slice(cursor), references }
    const end = text.indexOf('}', start + PREFIX.length)
    if (end < 0) throw new PluginReferenceSyntaxError('Unclosed plugin reference')
    const payload = text.slice(start + PREFIX.length, end)
    if (!payload.startsWith(VERSION)) throw new PluginReferenceSyntaxError('Unsupported plugin reference version')
    let decoded: string
    try { decoded = decodeURIComponent(payload.slice(VERSION.length)) } catch {
      throw new PluginReferenceSyntaxError('Invalid plugin reference encoding')
    }
    const id = pluginInstanceId(decoded)
    if (formatPluginReferenceMention(id) !== text.slice(start, end + 1)) {
      throw new PluginReferenceSyntaxError('Noncanonical plugin reference')
    }
    references.push(id)
    result += text.slice(cursor, start)
    cursor = end + 1
  }
}
