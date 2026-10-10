import type { RenderState } from '../rendering/controller'

export const initialRenderState: RenderState = { phase: 'starting', exporting: false }

export type RenderStateAction =
  | { type: 'status'; value: RenderState }
  | { type: 'retry' }

export function renderStateReducer(state: RenderState, action: RenderStateAction): RenderState {
  if (action.type === 'retry') {
    return { phase: 'starting', exporting: false, sizes: state.sizes }
  }
  return { ...state, ...action.value, sizes: action.value.sizes ?? state.sizes }
}
