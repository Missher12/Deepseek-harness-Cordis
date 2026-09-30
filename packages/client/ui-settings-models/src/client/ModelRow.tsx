/** Shared model fields and actions for both adapter catalog editors. */

import type { ReactNode } from 'react'
import type { ModelFieldsRenderer } from './slot-contract.ts'
import clsx from 'clsx'
import {
  IconChevronDownOutlineRegular, IconChevronRightOutlineRegular, IconTrashOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { DeepSeekModelDraft } from './DeepSeekModelsEditor.tsx'
import type { ModelsKey } from './locales.ts'
import { ModelInputTypes } from './ModelInputTypes.tsx'
import { ModelReasoningFields } from './ModelReasoningFields.tsx'
import type { ReasoningDeclaration } from './reasoning.ts'
import styles from './ModelsSection.module.css'

/** A capacity's editable text and adapter-specific inherited hint. */
interface CapacityInput {
  value: string
  placeholder: string
  onChange: (value: string) => void
  onBlur?: () => void
}

/** Adapter-owned data and actions for one model row. */
interface ModelRowProps extends Partial<ModelFieldsRenderer> {
  model: DeepSeekModelDraft
  position: number
  inputField: 'inputModalities' | 'input'
  reasoningEnabled?: boolean
  reasoningIdentity?: string
  reasoningFallback?: ReasoningDeclaration
  inputFallback?: readonly string[] | undefined
  inputLoading?: boolean
  expanded: boolean
  disabled: boolean
  t: (key: ModelsKey) => string
  contextWindow: CapacityInput
  maxTokens: CapacityInput
  onFieldChange: (field: 'id' | 'name', value: string | undefined) => void
  onIdBlur?: (value: string) => void
  onChange: (model: DeepSeekModelDraft) => void
  onToggle: () => void
  onRemove: () => void
}

/**
 * Render consistent model identity, capacity, and input-type controls.
 * @param props - drafted fields and their owning editor's actions.
 * @returns one expandable model entry.
 */
export function ModelRow(props: ModelRowProps): ReactNode {
  const { model, position, t, disabled } = props
  return (
    <div className={styles['modelEntry']}>
      <div className={styles['modelRow']}>
        {(['id', 'name'] as const).map(field => (
          <label className={styles['modelField']} key={field}>
            <span className={styles['modelFieldLabel']}>{t(field === 'id' ? 'modelId' : 'modelName')}</span>
            <input
              className={styles['input']}
              type="text"
              value={typeof model[field] === 'string' ? model[field] : ''}
              placeholder={t(field === 'id' ? 'modelId' : 'modelNamePlaceholder')}
              aria-label={`${t(field === 'id' ? 'modelId' : 'modelName')} ${String(position)}`}
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value
                props.onFieldChange(field, field === 'name' && value === '' ? undefined : value)
              }}
              onBlur={field === 'id' ? event => props.onIdBlur?.(event.target.value) : undefined}
            />
          </label>
        ))}
        <button
          type="button"
          className={styles['iconButton']}
          aria-label={`${t('modelAdvanced')} ${String(position)}`}
          aria-expanded={props.expanded}
          title={t('modelAdvanced')}
          onClick={props.onToggle}
        >
          {props.expanded ? <IconChevronDownOutlineRegular /> : <IconChevronRightOutlineRegular />}
        </button>
        <button
          type="button"
          className={clsx(styles['iconButton'], styles['iconButtonDanger'])}
          aria-label={`${t('removeModel')} ${String(position)}`}
          title={t('removeModel')}
          disabled={disabled}
          onClick={props.onRemove}
        >
          <IconTrashOutlineRegular size={14} />
        </button>
      </div>
      {props.expanded
        ? (
          <div className={styles['modelAdvanced']}>
            {(['contextWindow', 'maxTokens'] as const).map(field => (
              <label className={styles['modelField']} key={field}>
                <span className={styles['modelFieldLabel']}>{t(field)}</span>
                <input
                  className={styles['input']}
                  type="text"
                  inputMode="numeric"
                  value={props[field].value}
                  placeholder={props[field].placeholder}
                  aria-label={`${t(field)} ${String(position)}`}
                  disabled={disabled}
                  onChange={(event) => { props[field].onChange(event.target.value) }}
                  onBlur={props[field].onBlur}
                />
              </label>
            ))}

          </div>
        )
        : null}
      <div className={styles['modelCapabilities']}>
        <ModelInputTypes
          compact model={model} field={props.inputField} position={position}
          fallback={props.inputFallback} loading={props.inputLoading === true}
          disabled={disabled || props.inputLoading === true} t={t} onChange={props.onChange}
        />
        {props.reasoningEnabled === true ? (() => {
          const fallback = <ModelReasoningFields key={props.reasoningIdentity}
            value={model['reasoningEfforts']} inherited={props.reasoningFallback}
            label={String(position)} disabled={disabled} t={t}
            onChange={(value) => {
              const next = { ...model }
              if (value === undefined) delete next['reasoningEfforts']
              else next['reasoningEfforts'] = value
              props.onChange(next)
            }}/>
          return <div key={props.reasoningIdentity} className={styles['modelReasoningArea']}>{props.renderSlot === undefined ? fallback : props.renderSlot('settings.models.model-fields', {
            model, inherited: { reasoningEfforts: props.reasoningFallback }, position, disabled,
            onChange: props.onChange,
          }, { entryKey: 'llm-pi-ai', fallback })}</div>
        })() : null}
      </div>
    </div>
  )
}
