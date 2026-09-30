/** Renderer-local particle colour preference; never changes usage data or model settings. */
const KEY = 'dsh.usage-statistics.particle-color.v1'
const listeners = new Set<() => void>()
let current: string | undefined

/** Read a validated six-digit colour; an empty value follows the DSH theme. */
export function readParticleColor(): string {
  if (current !== undefined) return current
  try {
    const value = localStorage.getItem(KEY)
    current = value !== null && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : ''
  } catch {
    // Storage may be unavailable in a privacy-restricted renderer.
    current = ''
  }
  return current
}

/** Persist the chosen colour or restore the default when empty. */
export function setParticleColor(value: string): void {
  if (value !== '' && !/^#[0-9a-f]{6}$/i.test(value)) return
  current = value.toLowerCase()
  try {
    if (current === '') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, current)
  } catch {
    // Keep the in-memory choice usable when storage is full or unavailable.
  }
  for (const notify of listeners) notify()
}

function onStorage(event: StorageEvent): void {
  if (event.key !== KEY && event.key !== null) return
  current = undefined
  for (const notify of listeners) notify()
}

/** Share colour changes between mounted settings pages and other windows. */
export function subscribeParticleColor(notify: () => void): () => void {
  listeners.add(notify)
  if (listeners.size === 1) {
    current = undefined
    window.addEventListener('storage', onStorage)
  }
  return () => {
    listeners.delete(notify)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}
