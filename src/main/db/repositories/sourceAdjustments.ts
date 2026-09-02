import type { SourceAdjustment } from '@common/types/adjustment'
import { getDatabase } from '../database'

interface AdjustmentRow {
  source_key: string
  payload: string
  updated_at: number
}

export function listAdjustments(): Record<string, SourceAdjustment> {
  const rows = getDatabase().prepare(`SELECT * FROM source_adjustments`).all() as AdjustmentRow[]

  const result: Record<string, SourceAdjustment> = {}
  for (const row of rows) {
    try {
      result[row.source_key] = JSON.parse(row.payload) as SourceAdjustment
    } catch {
      // One unparseable row must not take the whole panel down on boot —
      // skip it and let the operator's next adjustment overwrite it.
      console.error(`[adjustments] dropping unreadable payload for ${row.source_key}`)
    }
  }
  return result
}

export function saveAdjustment(sourceKey: string, adjustment: SourceAdjustment): void {
  getDatabase()
    .prepare(
      `INSERT INTO source_adjustments (source_key, payload, updated_at)
       VALUES (@sourceKey, @payload, @updatedAt)
       ON CONFLICT(source_key) DO UPDATE SET payload = @payload, updated_at = @updatedAt`
    )
    .run({ sourceKey, payload: JSON.stringify(adjustment), updatedAt: Date.now() })
}

export function deleteAdjustment(sourceKey: string): void {
  getDatabase().prepare(`DELETE FROM source_adjustments WHERE source_key = ?`).run(sourceKey)
}
