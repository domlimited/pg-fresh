// Fallback used only until resolutionStore loads the persisted value from
// SQLite — see src/renderer/shared/store/resolutionStore.ts for the actual
// (user-configurable) canvas size, set in Phase 4.
export const DEFAULT_CANVAS_WIDTH = 1920
export const DEFAULT_CANVAS_HEIGHT = 1080

// Fixed id for the single active-source layer the whole app drives — the
// Viewer, Program monitor and Output window all key off this one id, so
// switching sources replaces this layer in place instead of stacking a new
// one (see sceneStore.setActiveSource()).
export const ACTIVE_LAYER_ID = 'active-layer'
