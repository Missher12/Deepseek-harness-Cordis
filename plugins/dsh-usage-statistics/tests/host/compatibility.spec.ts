import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {evaluatePluginCompatibility, getDshRuntimeVersion} from '@deepseek-ai/dsh-app-boot'

const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))

describe('real Host compatibility guard', () => {
  it('admits this Bundle on 0.2.0-rc.1 without any version exemption', () => {
    expect(getDshRuntimeVersion()).toBe('0.2.0-rc.1')
    expect(evaluatePluginCompatibility(manifest)).toBeUndefined()
  })

  it.each(['0.1.7-rc.2', '0.2.0', '0.2.1-rc.1'])('rejects the unvalidated runtime %s', runtime => {
    expect(evaluatePluginCompatibility(manifest, {}, runtime)).toMatchObject({
      name: manifest.name, version: manifest.version, runtimeVersion: runtime, exempted: false,
    })
  })

  it('still rejects the previous release manifest on the new Host', () => {
    const previous = {...manifest, version: '0.2.0', peerDependencies: {...manifest.peerDependencies,
      '@deepseek-ai/dsh-storage-domain': '0.1.7-rc.2',
      '@deepseek-ai/dsh-typert-protocol': '0.1.7-rc.2',
      '@deepseek-ai/dsh-session-persistence': '0.1.7-rc.2',
    }}
    expect(evaluatePluginCompatibility(previous)).toMatchObject({
      name: manifest.name, version: '0.2.0', runtimeVersion: '0.2.0-rc.1', exempted: false,
    })
  })
})
