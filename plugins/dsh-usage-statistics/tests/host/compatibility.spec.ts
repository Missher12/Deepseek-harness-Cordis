import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {evaluatePluginCompatibility, getDshRuntimeVersion} from '@deepseek-ai/dsh-app-boot'

const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))

describe('real Host compatibility guard', () => {
  it('admits this Bundle on 0.1.7-rc.2 without any version exemption', () => {
    expect(getDshRuntimeVersion()).toBe('0.1.7-rc.2')
    expect(evaluatePluginCompatibility(manifest)).toBeUndefined()
  })

  it.each(['0.1.5-rc.2', '0.1.8-rc.1'])('rejects the unvalidated runtime %s', runtime => {
    expect(evaluatePluginCompatibility(manifest, {}, runtime)).toMatchObject({
      name: manifest.name, version: manifest.version, runtimeVersion: runtime, exempted: false,
    })
  })
})
