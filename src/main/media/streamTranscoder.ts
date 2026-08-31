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

const KILL_TIMEOUT_MS = 1500

// SIGKILL is sent asynchronously — the OS hasn't necessarily released the
// process's file handles (ffmpeg-static's binary included) by the time
// command.kill() returns, so wait for the process to actually report back
// before resolving instead of assuming it's gone immediately.
function killAndWait(streamId: string, entry: StreamEntry): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const done = (): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        rmSync(getHlsDir(streamId), { recursive: true, force: true })
      } catch {
        // best-effort cleanup
      }
      resolve()
    }
    entry.command.once('error', done)
    entry.command.once('end', done)
    entry.command.kill('SIGKILL')
    const timer = setTimeout(done, KILL_TIMEOUT_MS)
  })
}

// Called from app 'before-quit' — a still-running ffmpeg child process has
// been one of the suspects behind the Windows installer failing to fully
// remove/replace files (ffmpeg-static's binary) during uninstall/upgrade.
// Returns a promise so the caller can delay app.quit() until every process
// has actually exited, not just been signaled.
export function stopAllStreams(): Promise<void> {
  const entries = [...activeStreams.entries()]
  activeStreams.clear()
  return Promise.all(entries.map(([streamId, entry]) => killAndWait(streamId, entry))).then(() => undefined)
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
