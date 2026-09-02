import type { MediaItem } from '@common/types/media'
import { getDatabase } from '../database'

interface MediaRow {
  id: string
  path: string
  display_path: string
  kind: string
  name: string
  duration_sec: number | null
  width: number | null
  height: number | null
  thumbnail_path: string | null
  needs_transcode: number
  transcode_status: string
  created_at: number
}

function rowToItem(row: MediaRow): MediaItem {
  return {
    id: row.id,
    path: row.path,
    displayPath: row.display_path,
    kind: row.kind as MediaItem['kind'],
    name: row.name,
    durationSec: row.duration_sec,
    width: row.width,
    height: row.height,
    thumbnailPath: row.thumbnail_path,
    needsTranscode: !!row.needs_transcode,
    transcodeStatus: row.transcode_status as MediaItem['transcodeStatus'],
    createdAt: row.created_at
  }
}

export function insertMedia(item: MediaItem): void {
  getDatabase()
    .prepare(
      `INSERT INTO media_library
        (id, path, display_path, kind, name, duration_sec, width, height, thumbnail_path, needs_transcode, transcode_status, created_at)
       VALUES (@id, @path, @displayPath, @kind, @name, @durationSec, @width, @height, @thumbnailPath, @needsTranscode, @transcodeStatus, @createdAt)`
    )
    .run({ ...item, needsTranscode: item.needsTranscode ? 1 : 0 })
}

export function listMedia(): MediaItem[] {
  const rows = getDatabase().prepare(`SELECT * FROM media_library ORDER BY created_at ASC`).all() as MediaRow[]
  return rows.map(rowToItem)
}

export function updateMedia(id: string, patch: Partial<MediaItem>): void {
  const row = getDatabase().prepare(`SELECT * FROM media_library WHERE id = ?`).get(id) as MediaRow | undefined
  if (!row) return

  const merged = { ...rowToItem(row), ...patch }
  getDatabase()
    .prepare(
      `UPDATE media_library SET
        display_path = @displayPath,
        duration_sec = @durationSec,
        width = @width,
        height = @height,
        thumbnail_path = @thumbnailPath,
        needs_transcode = @needsTranscode,
        transcode_status = @transcodeStatus
       WHERE id = @id`
    )
    .run({ ...merged, needsTranscode: merged.needsTranscode ? 1 : 0 })
}

export function deleteMedia(id: string): void {
  getDatabase().prepare(`DELETE FROM media_library WHERE id = ?`).run(id)
}

// Allow-list check for the media:// protocol handler (see src/main/protocol.ts)
// — answers "did the operator actually import this file?" for a path that
// arrived from the renderer, which may be running third-party page content.
//
// Windows path comparison is case-insensitive; SQLite's LOWER() only folds
// ASCII, which is exactly the range where Windows paths differ (drive letter
// casing, 8.3-style names) — non-ASCII filenames still compare byte-exact,
// same as on the other platforms.
export function isKnownMediaPath(absolutePath: string): boolean {
  const caseInsensitive = process.platform === 'win32'
  const column = (name: string): string => (caseInsensitive ? `LOWER(${name})` : name)
  const needle = caseInsensitive ? absolutePath.toLowerCase() : absolutePath

  const row = getDatabase()
    .prepare(
      `SELECT 1 FROM media_library
        WHERE ${column('path')} = @needle
           OR ${column('display_path')} = @needle
           OR ${column('thumbnail_path')} = @needle
        LIMIT 1`
    )
    .get({ needle })

  return row !== undefined
}
