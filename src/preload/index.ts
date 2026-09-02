import { contextBridge, ipcRenderer } from 'electron'
import { pathToFileURL } from 'url'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '@common/ipc-channels'
import type { ProgramUpdatePayload, TimecodeSyncPayload } from '@common/types/scene'
import type { MediaItem } from '@common/types/media'
import type { CanvasResolution } from '@common/types/settings'
import type { DisplayInfo, OutputStatus } from '@common/types/display'
import type { CaptureSourceList } from '@common/types/capture'
import type { SourceAdjustment } from '@common/types/adjustment'

const freshAPI = {
  appVersion: (): string => electronAPI.process.versions.electron ?? 'unknown',

  // Renders as a media://local/<path> URL so <video>/<img> can load local
  // files from the app's http:// (dev) or file:// (packaged) origin — see
  // src/main/protocol.ts for the handler that serves it. The "local" host
  // segment is required: Electron's "standard: true" custom schemes treat
  // an empty host as invalid (unlike file://) and silently swallow the
  // first path segment as the host instead.
  toMediaUrl: (absolutePath: string): string => {
    const filePathPart = pathToFileURL(absolutePath).href.slice('file://'.length)
    return `media://local${filePathPart}`
  },

  sendProgramUpdate: (payload: ProgramUpdatePayload): void => {
    ipcRenderer.send(IPC_CHANNELS.PROGRAM_UPDATE, payload)
  },

  onProgramUpdate: (callback: (payload: ProgramUpdatePayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ProgramUpdatePayload): void =>
      callback(payload)
    ipcRenderer.on(IPC_CHANNELS.PROGRAM_UPDATE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PROGRAM_UPDATE, listener)
  },

  sendTimecodeSync: (payload: TimecodeSyncPayload): void => {
    ipcRenderer.send(IPC_CHANNELS.TIMECODE_SYNC, payload)
  },

  onTimecodeSync: (callback: (payload: TimecodeSyncPayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TimecodeSyncPayload): void =>
      callback(payload)
    ipcRenderer.on(IPC_CHANNELS.TIMECODE_SYNC, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TIMECODE_SYNC, listener)
  },

  listMedia: (): Promise<MediaItem[]> => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_LIST),

  importMediaDialog: (): Promise<MediaItem[]> => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_IMPORT_DIALOG),

  importMediaPaths: (paths: string[]): Promise<MediaItem[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDIA_IMPORT_PATHS, paths),

  removeMedia: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_REMOVE, id),

  cancelTranscode: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDIA_CANCEL_TRANSCODE, id),

  onMediaLibraryUpdate: (callback: (items: MediaItem[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, items: MediaItem[]): void => callback(items)
    ipcRenderer.on(IPC_CHANNELS.MEDIA_LIBRARY_UPDATE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MEDIA_LIBRARY_UPDATE, listener)
  },

  sendSetBlack: (black: boolean): void => {
    ipcRenderer.send(IPC_CHANNELS.OUTPUT_SET_BLACK, black)
  },

  onSetBlack: (callback: (black: boolean) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, black: boolean): void => callback(black)
    ipcRenderer.on(IPC_CHANNELS.OUTPUT_SET_BLACK, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OUTPUT_SET_BLACK, listener)
  },

  sendSetFreeze: (freeze: boolean): void => {
    ipcRenderer.send(IPC_CHANNELS.OUTPUT_SET_FREEZE, freeze)
  },

  onSetFreeze: (callback: (freeze: boolean) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, freeze: boolean): void => callback(freeze)
    ipcRenderer.on(IPC_CHANNELS.OUTPUT_SET_FREEZE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OUTPUT_SET_FREEZE, listener)
  },

  getCanvasResolution: (): Promise<CanvasResolution> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_RESOLUTION),

  setCanvasResolution: (width: number, height: number): Promise<CanvasResolution> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_RESOLUTION, width, height),

  onResolutionUpdate: (callback: (resolution: CanvasResolution) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, resolution: CanvasResolution): void =>
      callback(resolution)
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_RESOLUTION_UPDATE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_RESOLUTION_UPDATE, listener)
  },

  startStream: (streamId: string, sourceUrl: string): Promise<{ streamId: string; playlistPath: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.STREAM_START, streamId, sourceUrl),

  stopStream: (streamId: string): void => {
    ipcRenderer.send(IPC_CHANNELS.STREAM_STOP, streamId)
  },

  listDisplays: (): Promise<DisplayInfo[]> => ipcRenderer.invoke(IPC_CHANNELS.DISPLAY_LIST),

  activateOutput: (displayId: number): Promise<OutputStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.OUTPUT_ACTIVATE, displayId),

  deactivateOutput: (): Promise<OutputStatus> => ipcRenderer.invoke(IPC_CHANNELS.OUTPUT_DEACTIVATE),

  setOutputHidden: (hidden: boolean): Promise<OutputStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.OUTPUT_SET_HIDDEN, hidden),

  onOutputStatusUpdate: (callback: (status: OutputStatus) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: OutputStatus): void => callback(status)
    ipcRenderer.on(IPC_CHANNELS.OUTPUT_STATUS_UPDATE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OUTPUT_STATUS_UPDATE, listener)
  },

  listSourceAdjustments: (): Promise<Record<string, SourceAdjustment>> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADJUSTMENT_LIST),

  saveSourceAdjustment: (sourceKey: string, adjustment: SourceAdjustment): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADJUSTMENT_SAVE, sourceKey, adjustment),

  deleteSourceAdjustment: (sourceKey: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADJUSTMENT_DELETE, sourceKey),

  listScreenSources: (): Promise<CaptureSourceList> => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_LIST_SCREENS),

  listWindowSources: (): Promise<CaptureSourceList> => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_LIST_WINDOWS),

  openScreenPermissionSettings: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_OPEN_PERMISSION_SETTINGS)
}

contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('fresh', freshAPI)

export type FreshAPI = typeof freshAPI
