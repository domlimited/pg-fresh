import { execFile } from 'child_process'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStaticPath from 'ffmpeg-static'
import { path as ffprobeStaticPath } from '@ffprobe-installer/ffprobe'

// electron-builder unpacks these binaries from app.asar at build time (see
// electron-builder.yml asarUnpack) — this makes the dev-time path work in a
// packaged build too, where "app.asar" must become "app.asar.unpacked".
function resolveBinaryPath(binaryPath: string): string {
  return binaryPath.replace('app.asar', 'app.asar.unpacked')
}

const FFMPEG_PATH = resolveBinaryPath(ffmpegStaticPath as unknown as string)
const FFPROBE_PATH = resolveBinaryPath(ffprobeStaticPath)

ffmpeg.setFfmpegPath(FFMPEG_PATH)
ffmpeg.setFfprobePath(FFPROBE_PATH)

// A file on an unreachable network share makes ffprobe hang indefinitely,
// which used to freeze the whole import (the await never settled).
const PROBE_TIMEOUT_MS = 15_000

export interface ProbeResult {
  durationSec: number | null
  width: number | null
  height: number | null
  videoCodec: string | null
  audioCodec: string | null
  playable: boolean
}

const FAILED_PROBE: ProbeResult = {
  durationSec: null,
  width: null,
  height: null,
  videoCodec: null,
  audioCodec: null,
  playable: false
}

interface FfprobeStream {
  codec_type?: string
  codec_name?: string
  width?: number
  height?: number
}

// Runs ffprobe directly rather than through fluent-ffmpeg so that a timeout
// actually KILLS the process — fluent-ffmpeg doesn't expose the child, so a
// Promise.race there would leave a stuck ffprobe holding the file open (which
// on Windows blocks uninstall/upgrade; see the notes in main/index.ts).
export function probeMedia(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    execFile(
      FFPROBE_PATH,
      ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
      { timeout: PROBE_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          console.error(`[ffmpeg] probe failed for ${filePath}:`, err.message)
          resolve(FAILED_PROBE)
          return
        }
        try {
          const data = JSON.parse(stdout) as { format?: { duration?: string }; streams?: FfprobeStream[] }
          const streams = data.streams ?? []
          const video = streams.find((s) => s.codec_type === 'video')
          const audio = streams.find((s) => s.codec_type === 'audio')
          const duration = Number(data.format?.duration)

          resolve({
            durationSec: Number.isFinite(duration) ? duration : null,
            width: video?.width ?? null,
            height: video?.height ?? null,
            videoCodec: video?.codec_name ?? null,
            // A file with no audio track is perfectly playable — null here
            // means "nothing to worry about", not "unsupported".
            audioCodec: audio?.codec_name ?? null,
            playable: true
          })
        } catch (parseErr) {
          console.error(`[ffmpeg] unreadable probe output for ${filePath}:`, parseErr)
          resolve(FAILED_PROBE)
        }
      }
    )
  })
}

export function generateVideoThumbnail(
  filePath: string,
  outputDir: string,
  filename: string
): Promise<string | null> {
  return new Promise((resolve) => {
    ffmpeg(filePath)
      .on('end', () => resolve(`${outputDir}/${filename}`))
      .on('error', () => resolve(null))
      .screenshots({ timestamps: ['1'], filename, folder: outputDir, size: '320x?' })
  })
}

// How much work a file actually needs to become playable in Chromium. The old
// code only ever did 'full' — a complete libx264 re-encode — for anything that
// wasn't already .mp4/.webm, so a long .mov straight off a camera took tens of
// minutes even though its streams were already fine (requirement-v5, ปัญหาข้อ 3).
export type TranscodePlan = 'none' | 'remux' | 'audio-only' | 'full'

function outputOptionsFor(plan: Exclude<TranscodePlan, 'none'>): string[] {
  // +faststart moves the moov atom to the front of the file. Without it the
  // index sits after the media data, so nothing can report a duration or seek
  // until the whole file has been read.
  const faststart = ['-movflags', '+faststart']
  switch (plan) {
    // Same streams, new container. Seconds instead of minutes.
    case 'remux':
      return ['-c', 'copy', ...faststart]
    // Picture is fine, only the audio codec is unsupported (AC-3, DTS, …).
    case 'audio-only':
      return ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', ...faststart]
    case 'full':
      return [
        '-c:v',
        'libx264',
        // veryfast over x264's "medium" default: this runs while an operator
        // waits to put the clip on air, and the output feeds an LED wall, not
        // an archive.
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        ...faststart
      ]
  }
}

const activeTranscodes = new Map<string, ReturnType<typeof ffmpeg>>()
// Killing ffmpeg surfaces as an ordinary 'error' event, indistinguishable
// from a real failure — this records which kills we asked for so a cancelled
// job isn't reported to the operator as "Transcode failed".
const cancelledTranscodes = new Set<string>()

export function isTranscoding(mediaId: string): boolean {
  return activeTranscodes.has(mediaId)
}

export function cancelTranscode(mediaId: string): boolean {
  const command = activeTranscodes.get(mediaId)
  if (!command) return false
  cancelledTranscodes.add(mediaId)
  command.kill('SIGKILL')
  return true
}

// Mirrors stopAllStreams(): a surviving ffmpeg child keeps ffmpeg-static's
// binary locked, which has broken Windows uninstall/upgrade before.
export function stopAllTranscodes(): void {
  for (const mediaId of [...activeTranscodes.keys()]) cancelTranscode(mediaId)
}

export class TranscodeCancelledError extends Error {
  constructor() {
    super('transcode cancelled')
    this.name = 'TranscodeCancelledError'
  }
}

export function transcodeToMp4(
  mediaId: string,
  filePath: string,
  outputPath: string,
  plan: Exclude<TranscodePlan, 'none'>,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(filePath)
      .outputOptions(outputOptionsFor(plan))
      .on('progress', (p) => {
        const percent = Number(p.percent)
        if (Number.isFinite(percent)) onProgress?.(Math.max(0, Math.min(100, percent)))
      })
      .on('end', () => {
        activeTranscodes.delete(mediaId)
        cancelledTranscodes.delete(mediaId)
        resolve()
      })
      .on('error', (err: Error) => {
        activeTranscodes.delete(mediaId)
        reject(cancelledTranscodes.delete(mediaId) ? new TranscodeCancelledError() : err)
      })

    activeTranscodes.set(mediaId, command)
    command.save(outputPath)
  })
}
