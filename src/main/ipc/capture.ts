import { desktopCapturer, ipcMain, systemPreferences } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'

const OWN_WINDOW_TITLES = new Set(['FRESH — Control', 'FRESH — Output'])

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

export function registerCaptureIpc(): void {
  ipcMain.handle(IPC_CHANNELS.CAPTURE_LIST_SCREENS, async () => {
    if (isScreenAccessDenied()) return { denied: true, sources: [] }
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 240, height: 135 } })
      return { denied: false, sources: sources.map((s) => ({ id: s.id, name: s.name, thumbnailDataUrl: s.thumbnail.toDataURL() })) }
    } catch {
      return { denied: true, sources: [] }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CAPTURE_LIST_WINDOWS, async () => {
    if (isScreenAccessDenied()) return { denied: true, sources: [] }
    try {
      const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 240, height: 135 } })
      // Exclude FRESH's own windows — capturing them as a layer inside the
      // same window (or its Output mirror) would produce an infinite
      // video-feedback loop.
      return {
        denied: false,
        sources: sources
          .filter((s) => !OWN_WINDOW_TITLES.has(s.name))
          .map((s) => ({ id: s.id, name: s.name, thumbnailDataUrl: s.thumbnail.toDataURL() }))
      }
    } catch {
      return { denied: true, sources: [] }
    }
  })
}
