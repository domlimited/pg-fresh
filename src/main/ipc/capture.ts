import { BrowserWindow, desktopCapturer, ipcMain, shell, systemPreferences } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'
import type { CaptureSource } from '@common/types/capture'

const THUMBNAIL_SIZE = { width: 240, height: 135 }

// macOS requires the user to grant Screen Recording access (TCC) in System
// Settings before desktopCapturer.getSources() will return anything — and
// there's no programmatic request prompt like getUserMedia's camera flow.
// systemPreferences.getMediaAccessStatus('screen') is checked first, but on
// some macOS versions it reports 'granted' even when access is actually
// denied for an unsigned dev build — so getSources() failing is *also*
// treated as "denied" rather than surfacing a raw IPC error to the renderer.
function isScreenAccessDenied(): boolean {
  return process.platform === 'darwin' && systemPreferences.getMediaAccessStatus('screen') !== 'granted'
}

// Capturing one of FRESH's own windows into a layer that is itself rendered
// inside that window produces an infinite video-feedback tunnel.
//
// Matched by media source id rather than by window title: getMediaSourceId()
// returns exactly the id format desktopCapturer reports, so this is an
// identity check. The previous title-based filter both over-matched (any
// other app whose window happened to be called "FRESH — Output" vanished from
// the operator's list) and under-matched (our own window retitled for any
// reason would start showing up).
function ownMediaSourceIds(): Set<string> {
  const ids = new Set<string>()
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    try {
      ids.add(window.getMediaSourceId())
    } catch {
      // A window torn down between the enumeration and this call.
    }
  }
  return ids
}

function toCaptureSource(source: Electron.DesktopCapturerSource): CaptureSource {
  return {
    id: source.id,
    name: source.name,
    thumbnailDataUrl: source.thumbnail.toDataURL(),
    // appIcon is null for screens, and for windows whose owner exposes none.
    appIconDataUrl: source.appIcon && !source.appIcon.isEmpty() ? source.appIcon.toDataURL() : null
  }
}

export function registerCaptureIpc(): void {
  ipcMain.handle(IPC_CHANNELS.CAPTURE_LIST_SCREENS, async () => {
    if (isScreenAccessDenied()) return { denied: true, sources: [] }
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: THUMBNAIL_SIZE })
      return { denied: false, sources: sources.map(toCaptureSource) }
    } catch (err) {
      console.error('[capture] screen enumeration failed', err)
      return { denied: true, sources: [] }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CAPTURE_LIST_WINDOWS, async () => {
    if (isScreenAccessDenied()) return { denied: true, sources: [] }
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: THUMBNAIL_SIZE,
        fetchWindowIcons: true
      })
      const own = ownMediaSourceIds()
      return { denied: false, sources: sources.filter((s) => !own.has(s.id)).map(toCaptureSource) }
    } catch (err) {
      console.error('[capture] window enumeration failed', err)
      return { denied: true, sources: [] }
    }
  })

  // There is no API to request Screen Recording access — the operator has to
  // grant it by hand, so at least take them straight to the right pane.
  ipcMain.handle(IPC_CHANNELS.CAPTURE_OPEN_PERMISSION_SETTINGS, async () => {
    if (process.platform !== 'darwin') return
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
  })
}
