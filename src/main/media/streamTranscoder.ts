import { existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import ffmpeg from 'fluent-ffmpeg'

interface StreamEntry {
  command: ReturnType<typeof ffmpeg>
  refCount: number
}

// Keyed by layer id, not source URL — both Control and Output windows call
// startStream() for the same live layer, and we want exactly one ffmpeg
// transcode running for it, not one per window.
const activeStreams = new Map<string, StreamEntry>()

function getHlsDir(streamId: string): string {
  const dir = join(app.getPath('userData'), 'hls', streamId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getPlaylistPath(streamId: string): string {
  return join(getHlsDir(streamId), 'playlist.m3u8')
}

export function startStream(streamId: string, sourceUrl: string): string {
  const playlistPath = getPlaylistPath(streamId)
  const existing = activeStreams.get(streamId)
  if (existing) {
    existing.refCount += 1
    return playlistPath
  }

  const command = ffmpeg(sourceUrl)
    .inputOptions(sourceUrl.startsWith('rtsp://') ? ['-rtsp_transport', 'tcp'] : [])
    .outputOptions([
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-f',
      'hls',
      '-hls_time',
      '2',
      '-hls_list_size',
      '6',
      '-hls_flags',
      'delete_segments+omit_endlist'
    ])
    .output(playlistPath)
    .on('error', (err: Error) => {
      if (!err.message.includes('SIGKILL')) {
        console.error(`[stream:${streamId}] ffmpeg error:`, err.message)
      }
      activeStreams.delete(streamId)
    })
    .on('end', () => activeStreams.delete(streamId))

  command.run()
  activeStreams.set(streamId, { command, refCount: 1 })
  return playlistPath
}

export function stopStream(streamId: string): void {
  const entry = activeStreams.get(streamId)
  if (!entry) return

  entry.refCount -= 1
  if (entry.refCount > 0) return

  entry.command.kill('SIGKILL')
  activeStreams.delete(streamId)
  try {
    rmSync(getHlsDir(streamId), { recursive: true, force: true })
  } catch {
    // best-effort cleanup
  }
}
