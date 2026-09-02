import { existsSync, mkdirSync } from 'fs'
import { basename, extname, join } from 'path'
import { app, dialog, ipcMain, nativeImage } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'
import type { MediaItem } from '@common/types/media'
import { mediaSourceKey } from '@common/types/adjustment'
import { deleteAdjustment } from '../db/repositories/sourceAdjustments'
import { deleteMedia, insertMedia, listMedia, updateMedia } from '../db/repositories/mediaLibrary'
import type { ProbeResult, TranscodePlan } from '../media/ffmpeg'
import {
  cancelTranscode,
  generateVideoThumbnail,
  probeMedia,
  TranscodeCancelledError,
  transcodeToMp4
} from '../media/ffmpeg'
import { getControlWindow } from '../windows/controlWindow'

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv']

// Containers Chromium can demux. .mkv and .avi cannot be played at all, no
// matter what is inside them — but their streams are usually fine, so they
// only need a container swap, not a re-encode.
const PLAYABLE_CONTAINERS = ['.mp4', '.m4v', '.mov', '.webm']

// Deliberately excludes hevc/h265. Chromium can often play it via the
// platform decoder, but "often" is the problem: a silent black frame during a
// live show costs far more than a one-time transcode at import. Widen this
// list only with evidence from the target machines.
const PLAYABLE_VIDEO_CODECS = ['h264', 'vp8', 'vp9', 'av1']
const PLAYABLE_AUDIO_CODECS = ['aac', 'mp3', 'opus', 'vorbis', 'flac']

// Works out the cheapest operation that makes a file playable. The old rule
// was extension-only — anything not .mp4/.webm got a full libx264 re-encode,
// so a 40-minute .mov of h264/aac (already perfectly playable streams) was
// re-encoded end to end for no reason (requirement-v5, ปัญหาข้อ 3).
function planFor(ext: string, probe: ProbeResult): TranscodePlan {
  if (!probe.playable) return 'full'

  const containerOk = PLAYABLE_CONTAINERS.includes(ext)
  const videoOk = !!probe.videoCodec && PLAYABLE_VIDEO_CODECS.includes(probe.videoCodec)
  // No audio track at all is fine — there is nothing to be incompatible.
  const audioOk = !probe.audioCodec || PLAYABLE_AUDIO_CODECS.includes(probe.audioCodec)

  if (!videoOk) return 'full'
  if (!audioOk) return 'audio-only'
  if (!containerOk) return 'remux'
  return 'none'
}

function ensureDir(dir: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getThumbnailDir(): string {
  return ensureDir(join(app.getPath('userData'), 'thumbnails'))
}

function getTranscodeDir(): string {
  return ensureDir(join(app.getPath('userData'), 'transcoded'))
}

function broadcastMediaUpdate(): void {
  const control = getControlWindow()
  if (!control || control.isDestroyed()) return
  control.webContents.send(IPC_CHANNELS.MEDIA_LIBRARY_UPDATE, withProgress(listMedia()))
}

// Progress lives here rather than in SQLite: it is meaningless once the app
// restarts, and writing it would mean a row update per ffmpeg tick.
const transcodeProgress = new Map<string, number>()

function withProgress(items: MediaItem[]): MediaItem[] {
  return items.map((item) =>
    transcodeProgress.has(item.id) ? { ...item, transcodeProgress: transcodeProgress.get(item.id) } : item
  )
}

async function runTranscode(item: MediaItem, plan: Exclude<TranscodePlan, 'none'>): Promise<void> {
  updateMedia(item.id, { transcodeStatus: 'transcoding' })
  transcodeProgress.set(item.id, 0)
  broadcastMediaUpdate()

  const outputPath = join(getTranscodeDir(), `${item.id}.mp4`)
  let lastBroadcastPercent = -1

  try {
    await transcodeToMp4(item.id, item.path, outputPath, plan, (percent) => {
      transcodeProgress.set(item.id, percent)
      // ffmpeg emits progress many times a second; only push to the renderer
      // when the displayed whole number would actually change.
      const rounded = Math.floor(percent)
      if (rounded === lastBroadcastPercent) return
      lastBroadcastPercent = rounded
      broadcastMediaUpdate()
    })
    updateMedia(item.id, { displayPath: outputPath, transcodeStatus: 'done' })
  } catch (err) {
    if (err instanceof TranscodeCancelledError) {
      // The operator asked for this — leave the row importable rather than
      // flagging it as a failure they need to investigate.
      updateMedia(item.id, { transcodeStatus: 'pending' })
    } else if (plan !== 'full') {
      // A stream copy can fail on quirks a real re-encode absorbs (odd
      // timestamps, a codec the mp4 container won't hold). Fall back rather
      // than leaving the operator with an unplayable file.
      console.error(`[media] ${plan} failed for ${item.name}, retrying as a full transcode:`, err)
      transcodeProgress.delete(item.id)
      await runTranscode(item, 'full')
      return
    } else {
      console.error(`[media] transcode failed for ${item.name}:`, err)
      updateMedia(item.id, { transcodeStatus: 'failed' })
    }
  }

  transcodeProgress.delete(item.id)
  broadcastMediaUpdate()
}

// Images used to be stored with width/height null, which left the Program
// monitor's "AR:" readout showing the layer box's ratio rather than the
// picture's — and gave nothing to compare against when deciding whether a
// frame is being cropped.
async function probeImageSize(filePath: string): Promise<{ width: number | null; height: number | null }> {
  // nativeImage decodes PNG/JPEG in-process: no subprocess, no temp file.
  const { width, height } = nativeImage.createFromPath(filePath).getSize()
  if (width > 0 && height > 0) return { width, height }

  // Formats nativeImage declines (it returns an empty 0x0 image rather than
  // throwing) still have readable headers — fall back to ffprobe.
  const probe = await probeMedia(filePath)
  return { width: probe.width, height: probe.height }
}

async function importFile(filePath: string): Promise<MediaItem | null> {
  const ext = extname(filePath).toLowerCase()
  const isImage = IMAGE_EXTENSIONS.includes(ext)
  const isVideo = VIDEO_EXTENSIONS.includes(ext)
  if (!isImage && !isVideo) return null

  const id = crypto.randomUUID()
  const name = basename(filePath)

  if (isImage) {
    const { width, height } = await probeImageSize(filePath)
    const item: MediaItem = {
      id,
      path: filePath,
      displayPath: filePath,
      kind: 'image',
      name,
      durationSec: null,
      width,
      height,
      thumbnailPath: filePath,
      needsTranscode: false,
      transcodeStatus: 'none',
      createdAt: Date.now()
    }
    insertMedia(item)
    return item
  }

  const probe = await probeMedia(filePath)
  const thumbnailPath = probe.playable
    ? await generateVideoThumbnail(filePath, getThumbnailDir(), `${id}.jpg`)
    : null
  const plan = planFor(ext, probe)
  const needsTranscode = plan !== 'none'

  const item: MediaItem = {
    id,
    path: filePath,
    displayPath: filePath,
    kind: 'video',
    name,
    durationSec: probe.durationSec,
    width: probe.width,
    height: probe.height,
    thumbnailPath,
    needsTranscode,
    transcodeStatus: needsTranscode ? 'pending' : 'none',
    createdAt: Date.now()
  }
  insertMedia(item)

  if (plan !== 'none') void runTranscode(item, plan)

  return item
}

async function importFiles(paths: string[]): Promise<MediaItem[]> {
  const items: MediaItem[] = []
  for (const filePath of paths) {
    const item = await importFile(filePath)
    if (item) items.push(item)
  }
  broadcastMediaUpdate()
  return items
}

export function registerMediaIpc(): void {
  ipcMain.handle(IPC_CHANNELS.MEDIA_LIST, () => withProgress(listMedia()))

  ipcMain.handle(IPC_CHANNELS.MEDIA_CANCEL_TRANSCODE, (_event, id: string) => cancelTranscode(id))

  ipcMain.handle(IPC_CHANNELS.MEDIA_IMPORT_DIALOG, async () => {
    const win = getControlWindow()
    if (!win) return []

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media', extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS].map((e) => e.slice(1)) }
      ]
    })
    if (result.canceled) return []
    return importFiles(result.filePaths)
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_IMPORT_PATHS, (_event, paths: string[]) => importFiles(paths))

  ipcMain.handle(IPC_CHANNELS.MEDIA_REMOVE, (_event, id: string) => {
    deleteMedia(id)
    // Otherwise the row outlives the media and leaks forever — and a future
    // import that happened to reuse the id would inherit a stranger's crop.
    deleteAdjustment(mediaSourceKey(id))
    broadcastMediaUpdate()
  })
}
