import type { CanvasResolution } from '@common/types/settings'
import { getDatabase } from '../database'

export function getResolution(): CanvasResolution {
  const row = getDatabase()
    .prepare(`SELECT width, height FROM canvas_settings WHERE id = 1`)
    .get() as CanvasResolution
  return row
}

export function setResolution(width: number, height: number): CanvasResolution {
  getDatabase()
    .prepare(`UPDATE canvas_settings SET width = @width, height = @height WHERE id = 1`)
    .run({ width, height })
  return { width, height }
}
