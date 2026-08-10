import { existsSync, mkdirSync } from 'fs'
import { basename, extname, join } from 'path'
import { app, dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'
import type { MediaItem } from '@common/types/media'
import { deleteMedia, insertMedia, listMedia, updateMedia } from '../db/repositories/mediaLibrary'
import { generateVideoThumbnail, probeMedia, transcodeToMp4 } from '../media/ffmpeg'
import { getControlWindow } from '../windows/controlWindow'

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
// Formats Chromium can reliably play back without transcoding.
const NATIVE_VIDEO_EXTENSIONS = ['.mp4', '.webm']

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
  getControlWindow()?.webContents.send(IPC_CHANNELS.MEDIA_LIBRARY_UPDATE, listMedia())
}

async function runTranscode(item: MediaItem): Promise<void> {
  updateMedia(item.id, { transcodeStatus: 'transcoding' })
  broadcastMediaUpdate()

  const outputPath = join(getTranscodeDir(), `${item.id}.mp4`)
  try {
    await transcodeToMp4(item.path, outputPath)
    updateMedia(item.id, { displayPath: outputPath, transcodeStatus: 'done' })
  } catch {
    updateMedia(item.id, { transcodeStatus: 'failed' })
  }
  broadcastMediaUpdate()
}

async function importFile(filePath: string): Promise<MediaItem | null> {
  const ext = extname(filePath).toLowerCase()
  const isImage = IMAGE_EXTENSIONS.includes(ext)
  const isVideo = VIDEO_EXTENSIONS.includes(ext)
  if (!isImage && !isVideo) return null

  const id = crypto.randomUUID()
  const name = basename(filePath)

  if (isImage) {
    const item: MediaItem = {
      id,
      path: filePath,
      displayPath: filePath,
      kind: 'image',
      name,
      durationSec: null,
      width: null,
      height: null,
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
  const needsTranscode = !NATIVE_VIDEO_EXTENSIONS.includes(ext) || !probe.playable

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

  if (needsTranscode) void runTranscode(item)

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
  ipcMain.handle(IPC_CHANNELS.MEDIA_LIST, () => listMedia())

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
    broadcastMediaUpdate()
  })
}
