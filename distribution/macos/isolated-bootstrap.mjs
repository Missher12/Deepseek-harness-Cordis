// Keep the community Intel installation separate from upstream user data.
import { app } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'

const override = process.env.DSH_MISSHER_ROOT
if (override !== undefined && !isAbsolute(override)) throw new Error('DSH_MISSHER_ROOT must be absolute')
const root = override ?? join(homedir(), 'Library', 'Application Support', 'DeepSeek Harness Intel')
const userData = join(root, 'electron')
const harness = join(root, 'harness')
const logs = override === undefined ? join(homedir(), 'Library', 'Logs', 'DeepSeek Harness Intel') : join(root, 'logs')
for (const directory of [root, userData, harness, logs, join(logs, 'Crashpad')]) mkdirSync(directory, { recursive: true, mode: 0o700 })
process.env.DSH_HOME = harness
app.setName('DeepSeek Harness')
app.setPath('userData', userData)
app.setPath('sessionData', userData)
app.setPath('crashDumps', join(logs, 'Crashpad'))
app.setAppLogsPath(logs)
const state = { version: app.getVersion(), pid: process.pid, arch: process.arch, dshHome: harness, userData, windows: [] }
const save = () => writeFileSync(join(root, 'isolation-runtime.json'), JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })
save()
app.on('browser-window-created', (_event, window) => {
  const record = { id: window.id, loaded: false, visible: false }
  state.windows.push(record)
  window.webContents.on('did-finish-load', () => { record.loaded = true; record.visible = window.isVisible(); save() })
  window.on('show', () => { record.visible = true; save() })
  window.webContents.on('render-process-gone', (_event, details) => { record.rendererExit = details.reason; save() })
})
await import('./main.js')
