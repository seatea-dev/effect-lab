type ControlDefinition = {
  label: string
  min?: number
  max?: number
  step?: number
  values?: readonly unknown[]
}

type EffectDefinition = {
  id: string
  defaults: Record<string, unknown>
  controls: Record<string, ControlDefinition>
  process: unknown
}

type PresetDefinition = {
  id: string
  name: string
  thumbnailUrl: string
  effectId: string
  params: Record<string, unknown>
}

function fail(message: string): never {
  throw new Error(`Invalid effect or preset definitions: ${message}`)
}

function onStep(value: number, min: number, step: number): boolean {
  const position = (value - min) / step
  return Math.abs(position - Math.round(position)) < 1e-8
}

function validateParameters(effect: EffectDefinition, params: Record<string, unknown>, owner: string): void {
  const controlNames = Object.keys(effect.controls).sort()
  const parameterNames = Object.keys(params).sort()
  if (controlNames.length !== parameterNames.length || controlNames.some((name, index) => name !== parameterNames[index])) {
    fail(`${owner} parameters do not match the controls for effect "${effect.id}"`)
  }

  for (const [name, control] of Object.entries(effect.controls)) {
    if (typeof control.label !== 'string' || !control.label.trim()) fail(`control "${effect.id}.${name}" needs a label`)
    const value = params[name]
    const hasRange = control.min !== undefined || control.max !== undefined || control.step !== undefined

    if (control.values !== undefined) {
      if (hasRange || control.values.length === 0 || new Set(control.values).size !== control.values.length || !control.values.includes(value)) {
        fail(`parameter "${effect.id}.${name}" must use one unique allowed value`)
      }
    } else if (hasRange) {
      const { min, max, step } = control
      if (typeof min !== 'number' || !Number.isFinite(min)
        || typeof max !== 'number' || !Number.isFinite(max) || max < min
        || typeof step !== 'number' || !Number.isFinite(step) || step <= 0
        || !onStep(max, min, step)) {
        fail(`control "${effect.id}.${name}" needs a valid range and step`)
      }
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || !onStep(value, min, step)) {
        fail(`parameter "${effect.id}.${name}" must be within range and aligned to its step`)
      }
    } else if (typeof value !== 'boolean') {
      fail(`parameter "${effect.id}.${name}" must be boolean or define a range or allowed values`)
    }
  }
}

export function validateDefinitions(
  effects: Record<string, EffectDefinition>,
  presets: readonly PresetDefinition[],
): void {
  const effectIds = new Set<string>()
  for (const [key, effect] of Object.entries(effects)) {
    if (typeof effect.id !== 'string' || !effect.id.trim() || effectIds.has(effect.id)) fail(`effect ID "${effect.id}" is empty or duplicated`)
    effectIds.add(effect.id)
    if (key !== effect.id) fail(`effect registry key "${key}" does not match ID "${effect.id}"`)
    if (typeof effect.process !== 'function') fail(`effect "${effect.id}" needs a processor`)
    validateParameters(effect, effect.defaults, `effect "${effect.id}" defaults`)
  }

  const presetIds = new Set<string>()
  for (const preset of presets) {
    if (typeof preset.id !== 'string' || !preset.id.trim() || presetIds.has(preset.id)) fail(`preset ID "${preset.id}" is empty or duplicated`)
    presetIds.add(preset.id)
    if (typeof preset.name !== 'string' || !preset.name.trim()) fail(`preset "${preset.id}" needs a name`)
    if (typeof preset.thumbnailUrl !== 'string' || !preset.thumbnailUrl.trim()) fail(`preset "${preset.id}" needs a bundled thumbnail URL`)
    const effect = effects[preset.effectId]
    if (!Object.hasOwn(effects, preset.effectId) || !effect || effect.id !== preset.effectId) {
      fail(`preset "${preset.id}" references unknown effect "${preset.effectId}"`)
    }
    validateParameters(effect, preset.params, `preset "${preset.id}"`)
  }
}
