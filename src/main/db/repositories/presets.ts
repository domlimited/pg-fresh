import type { Layer } from '@common/types/scene'
import type { Preset } from '@common/types/preset'
import { getDatabase } from '../database'

interface PresetRow {
  id: string
  name: string
  slot: number
  layers_json: string
  created_at: number
}

function rowToPreset(row: PresetRow): Preset {
  return {
    id: row.id,
    name: row.name,
    slot: row.slot,
    layers: JSON.parse(row.layers_json) as Layer[],
    createdAt: row.created_at
  }
}

export function listPresets(): Preset[] {
  const rows = getDatabase().prepare(`SELECT * FROM presets ORDER BY slot ASC`).all() as PresetRow[]
  return rows.map(rowToPreset)
}

export function upsertPresetSlot(slot: number, layers: Layer[]): Preset {
  const db = getDatabase()
  const existing = db.prepare(`SELECT * FROM presets WHERE slot = ?`).get(slot) as PresetRow | undefined
  const layersJson = JSON.stringify(layers)
  const createdAt = Date.now()

  if (existing) {
    db.prepare(`UPDATE presets SET layers_json = @layersJson, created_at = @createdAt WHERE id = @id`).run({
      layersJson,
      createdAt,
      id: existing.id
    })
    return { id: existing.id, name: existing.name, slot, layers, createdAt }
  }

  const id = crypto.randomUUID()
  const name = `Preset ${slot}`
  db.prepare(
    `INSERT INTO presets (id, name, slot, layers_json, created_at) VALUES (@id, @name, @slot, @layersJson, @createdAt)`
  ).run({ id, name, slot, layersJson, createdAt })
  return { id, name, slot, layers, createdAt }
}

export function clearPresetSlot(slot: number): void {
  getDatabase().prepare(`DELETE FROM presets WHERE slot = ?`).run(slot)
}
