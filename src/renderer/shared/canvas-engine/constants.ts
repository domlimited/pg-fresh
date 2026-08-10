// Fallback used only until resolutionStore loads the persisted value from
// SQLite — see src/renderer/shared/store/resolutionStore.ts for the actual
// (user-configurable) canvas size, set in Phase 4.
export const DEFAULT_CANVAS_WIDTH = 1920
export const DEFAULT_CANVAS_HEIGHT = 1080

export const GRID_SIZE = 20

// Fixed id for the full-canvas layer the Queue system drives — reusing one
// id lets advancing the queue replace this layer in place instead of
// stacking a new one on every advance.
export const QUEUE_LAYER_ID = 'queue-layer'
