import ffmpeg from 'fluent-ffmpeg'
import ffmpegStaticPath from 'ffmpeg-static'
import { path as ffprobeStaticPath } from '@ffprobe-installer/ffprobe'

// electron-builder unpacks these binaries from app.asar at build time (see
// electron-builder.yml asarUnpack) — this makes the dev-time path work in a
// packaged build too, where "app.asar" must become "app.asar.unpacked".
function resolveBinaryPath(binaryPath: string): string {
  return binaryPath.replace('app.asar', 'app.asar.unpacked')
}

ffmpeg.setFfmpegPath(resolveBinaryPath(ffmpegStaticPath as unknown as string))
ffmpeg.setFfprobePath(resolveBinaryPath(ffprobeStaticPath))

export interface ProbeResult {
  durationSec: number | null
  width: number | null
  height: number | null
  playable: boolean
}

export function probeMedia(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        resolve({ durationSec: null, width: null, height: null, playable: false })
        return
      }
      const videoStream = data.streams.find((s) => s.codec_type === 'video')
      resolve({
        durationSec: data.format.duration ?? null,
        width: videoStream?.width ?? null,
        height: videoStream?.height ?? null,
        playable: true
      })
    })
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

export function transcodeToMp4(
  filePath: string,
  outputPath: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('progress', (p) => onProgress?.(p.percent ?? 0))
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .save(outputPath)
  })
}
