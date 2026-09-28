// @vitest-environment jsdom
/** Model capability declarations keep route scope, sparse sets, and wire values. */
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Schema from '@deepseek-ai/schemastery'
import type { SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { ModelReasoningFields } from '../src/client/ModelReasoningFields.tsx'
import { ModelListEditor } from '../src/client/ModelListEditor.tsx'
import { ProviderEditor } from '../src/client/ProviderEditor.tsx'
import type { ReasoningDeclaration } from '../src/client/reasoning.ts'
import { en } from '../src/client/locales.ts'
import { settingsSchema } from './settings-schema.client.ts'

afterEach(cleanup)
const t = (key: keyof typeof en): string => en[key]
const sparse = { off: null, low: 'light', high: 'deep', max: 'ultra' }
const field = (key: keyof typeof en, label = '1') => screen.getByLabelText(`${en[key]} ${label}`)
const change = (key: keyof typeof en, value: string, label = '1') => fireEvent.change(field(key, label), { target: { value } })

function Editor({ initial, inherited }: { initial?: ReasoningDeclaration; inherited?: ReasoningDeclaration }) {
  const [value, setValue] = useState(initial)
  return <><ModelReasoningFields value={value} inherited={inherited} label="1" disabled={false} t={t} onChange={setValue} />
    <output>{JSON.stringify(value) ?? 'inherit'}</output></>
}

describe('reasoning declarations', () => {
  it('supports max → high → max without losing sparse aliases or inventing levels', () => {
    render(<Editor initial={sparse} />)
    change('reasoningMaximum', 'high')
    expect(screen.getByRole('status').textContent).toBe(JSON.stringify({ off: null, low: 'light', high: 'deep' }))
    expect([...field('reasoningMaximum').querySelectorAll('option')].map(option => option.value)).toEqual(['off', 'low', 'high', 'max'])
    change('reasoningMaximum', 'max')
    expect(screen.getByRole('status').textContent).toBe(JSON.stringify(sparse))
    expect(screen.getByText(en.reasoningAdvanced).closest('details')?.open).toBe(false)
  })

  it('keeps inherit, disabled and custom distinct and never invents an unknown wire value', () => {
    render(<Editor />)
    expect(screen.getByRole('status').textContent).toBe('inherit')
    change('reasoningMode', 'disabled')
    expect(screen.getByRole('status').textContent).toBe('false')
    change('reasoningMode', 'custom')
    expect(screen.getByRole('alert').textContent).toBe(en.reasoningInvalid)
    fireEvent.click(screen.getByText(en.reasoningAdvanced))
    fireEvent.click(screen.getByLabelText(`${en.reasoningSupported} high 1`))
    expect(screen.getByRole('status').textContent).toBe('{"high":""}')
    fireEvent.change(screen.getByLabelText(`${en.reasoningWire} high 1`), { target: { value: 'deep' } })
    expect(screen.queryByRole('alert')).toBeNull()
    change('reasoningMode', 'inherit')
    change('reasoningMode', 'custom')
    expect(screen.getByRole('status').textContent).toBe('{"high":"deep"}')
  })
})

const modelSchema = Schema.object({
  id: Schema.string().required(),
  name: Schema.string(),
  reasoningEfforts: Schema.union([Schema.const(false), Schema.dict(Schema.union([Schema.string(), Schema.const(null)]))]),
})
const config = Schema.object({
  routes: Schema.dict(Schema.object({
    models: Schema.array(modelSchema),
    modelOverrides: Schema.dict(modelSchema),
    baseURL: Schema.string(),
    api: Schema.string(),
  })),
})
function namespace(profiles: Record<string, JsonValue>): SettingsNamespaceView {
  return { ns: 'renamed-adapter', schema: JSON.parse(JSON.stringify(config.toJSON())) as JsonValue,
    value: { routes: profiles }, user: { routes: profiles }, base: { routes: {} },
    revision: 7, autoGenerate: true, applies: 'live', secrets: [] }
}
function operations(view = namespace({})) {
  return {
    describeCredential: vi.fn().mockResolvedValue(undefined),
    storeCredential: vi.fn().mockResolvedValue(undefined),
    removeCredential: vi.fn().mockResolvedValue(undefined),
    writeSettings: vi.fn().mockResolvedValue({ kind: 'written', view: { ...view, revision: 8 } }),
    discoverModels: vi.fn().mockResolvedValue({ kind: 'found', models: [{ id: 'same', name: 'Same', reasoningEfforts: sparse }, { id: 'other', reasoningEfforts: false }] }),
  }
}

describe('provider capability writes', () => {
  it('edits only one explicit model through the dynamic namespace/path and revision', async () => {
    const model = { id: 'same', reasoningEfforts: sparse, compat: { custom: true } }
    const other = { id: 'second', contextWindow: 8000 }
    const profile = { models: [model, other], baseURL: 'https://example.invalid', apiKeyEnv: 'UNCHANGED', reasoning: 'max', unknown: 'keep' }
    const view = namespace({ a: profile, b: { models: [{ id: 'same', reasoningEfforts: { high: 'different' } }] } })
    const ops = operations(view)
    const onClose = vi.fn()
    render(<ProviderEditor provider="a" displayName="A" namespace={view} settingsPath={['routes', 'a']} schema={settingsSchema} operations={ops} t={t} readOnly={false} onClose={onClose} />)
    fireEvent.click(screen.getByText(en.customized))
    fireEvent.click(screen.getByLabelText(`${en.modelAdvanced} 1`))
    change('reasoningMaximum', 'high')
    fireEvent.click(screen.getByRole('button', { name: en.apply }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledWith(true) })
    expect(ops.writeSettings).toHaveBeenCalledWith('renamed-adapter', [{ op: 'set', path: ['routes', 'a', 'models', '0', 'reasoningEfforts'], value: { off: null, low: 'light', high: 'deep' } }], 7)
    expect(ops.storeCredential).not.toHaveBeenCalled()
    expect(profile.reasoning).toBe('max')
    expect(view.user).toEqual({ routes: { a: profile, b: { models: [{ id: 'same', reasoningEfforts: { high: 'different' } }] } } })
  })

  it('restores the composition declaration with a field unset and respects read-only mode', async () => {
    const view = namespace({ a: { modelOverrides: { same: { reasoningEfforts: false, name: 'Keep' } } } })
    view.base = { routes: { a: { modelOverrides: { same: { reasoningEfforts: { off: null, high: 'base-wire' } } } } } }
    const ops = operations(view)
    const onClose = vi.fn()
    const { rerender } = render(<ProviderEditor provider="a" displayName="A" namespace={view} settingsPath={['routes', 'a']} schema={settingsSchema} operations={ops} t={t} readOnly={true} onClose={onClose} />)
    fireEvent.click(screen.getByText(en.customized))
    await waitFor(() => { expect(screen.getByText(en.reasoningCatalog)).toBeTruthy() })
    fireEvent.click(screen.getByText(en.reasoningCatalog))
    fireEvent.click(screen.getByText('Same (same)'))
    expect(field('reasoningMode', 'same').closest('fieldset')?.disabled).toBe(true)
    rerender(<ProviderEditor provider="a" displayName="A" namespace={view} settingsPath={['routes', 'a']} schema={settingsSchema} operations={ops} t={t} readOnly={false} onClose={onClose} />)
    change('reasoningMode', 'custom', 'same')
    fireEvent.click(screen.getByText(en.reasoningAdvanced))
    expect(screen.getByLabelText(`${en.reasoningWire} high same`).value).toBe('base-wire')
    change('reasoningMode', 'inherit', 'same')
    fireEvent.click(screen.getByRole('button', { name: en.apply }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledWith(true) })
    expect(ops.writeSettings).toHaveBeenCalledWith('renamed-adapter', [{ op: 'unset', path: ['routes', 'a', 'modelOverrides', 'same', 'reasoningEfforts'] }], 7)
  })

  it('uses a catalog override, preserves sibling fields, and leaves a conflicted draft open', async () => {
    const overrides = { same: { name: 'Renamed', compat: { future: true } }, other: { reasoningEfforts: false } }
    const view = namespace({ a: { modelOverrides: overrides, apiKeyEnv: 'UNCHANGED' } })
    const ops = operations(view)
    ops.writeSettings.mockResolvedValue({ kind: 'conflict', message: 'stale' })
    const onClose = vi.fn()
    render(<ProviderEditor provider="a" displayName="A" namespace={view} settingsPath={['routes', 'a']} schema={settingsSchema} operations={ops} t={t} readOnly={false} onClose={onClose} />)
    fireEvent.click(screen.getByText(en.customized))
    await waitFor(() => { expect(screen.getByText(en.reasoningCatalog)).toBeTruthy() })
    fireEvent.click(screen.getByText(en.reasoningCatalog))
    fireEvent.click(screen.getByText('Same (same)'))
    change('reasoningMode', 'custom', 'same')
    change('reasoningMaximum', 'high', 'same')
    fireEvent.click(screen.getByRole('button', { name: en.apply }))
    await waitFor(() => { expect(screen.getByText(en.conflict)).toBeTruthy() })
    expect(onClose).not.toHaveBeenCalled()
    expect(ops.writeSettings).toHaveBeenCalledWith('renamed-adapter', [{ op: 'set', path: ['routes', 'a', 'modelOverrides', 'same', 'reasoningEfforts'], value: { off: null, low: 'light', high: 'deep' } }], 7)
    expect((field('reasoningMaximum', 'same') as HTMLSelectElement).value).toBe('high')
  })
})

describe('model-local editing memory', () => {
  it('does not transfer cached mappings after deleting another row or changing the model ID', () => {
    const ops = operations()
    function List() {
      const [models, setModels] = useState<Record<string, unknown>[]>([{ id: 'a', reasoningEfforts: sparse }, { id: 'b' }])
      return <ModelListEditor models={models} onChange={setModels} probe={{ settingsNs: 'instance', provider: 'route' }} operations={ops} t={t} disabled={false} onBusyChange={() => {}} />
    }
    render(<List />)
    fireEvent.click(screen.getByLabelText(`${en.modelAdvanced} 1`))
    change('reasoningMode', 'inherit')
    fireEvent.click(screen.getByLabelText(`${en.modelAdvanced} 2`))
    fireEvent.click(screen.getByLabelText(`${en.removeModel} 1`))
    change('reasoningMode', 'custom')
    expect(screen.getByRole('alert').textContent).toBe(en.reasoningInvalid)
    expect((field('reasoningMaximum') as HTMLSelectElement).value).toBe('')
    fireEvent.click(screen.getByText(en.reasoningAdvanced))
    fireEvent.click(screen.getByLabelText(`${en.reasoningSupported} high 1`))
    fireEvent.change(screen.getByLabelText(`${en.reasoningWire} high 1`), { target: { value: 'b-only' } })
    change('reasoningMode', 'inherit')
    fireEvent.change(screen.getByLabelText(`${en.modelId} 1`), { target: { value: 'c' } })
    change('reasoningMode', 'custom')
    expect((field('reasoningMaximum') as HTMLSelectElement).value).toBe('')
  })
})
