import { app, BrowserWindow, components } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './db/database'
import { stopAllStreams } from './media/streamTranscoder'
import { registerCaptureIpc } from './ipc/capture'
import { registerDisplayIpc } from './ipc/display'
import { registerMediaIpc } from './ipc/media'
import { registerSceneIpc } from './ipc/scene'
import { registerSettingsIpc } from './ipc/settings'
import { registerStreamIpc } from './ipc/stream'
import { registerMediaProtocolHandler, registerMediaProtocolPrivileges } from './protocol'
import { registerPermissionHandlers } from './permissions'
import { createControlWindow } from './windows/controlWindow'

registerMediaProtocolPrivileges()

const WIDEVINE_INSTALL_TIMEOUT_MS = 15_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.fresh.app')

  // This Electron build is castlabs' Widevine-enabled fork (see
  // package.json) — installs/updates the Widevine CDM on first launch so
  // EME-gated playback (YouTube's embedded player, most DASH streams) works
  // in the "เว็บ / สตรีม" webview layer. Without this, YouTube's player
  // reports the video as unavailable since Electron ships no DRM support by
  // default.
  //
  // Never let this block/kill the app: a firewalled network, blocked
  // component-update server, etc. must not stop the LED control window
  // (unrelated to Widevine) from opening — worst case, YouTube playback
  // just doesn't work, same as before this was added. A bounded timeout is
  // required in addition to the try/catch: whenReady() rejecting is caught
  // fine, but a request that hangs instead of failing (e.g. packets
  // silently dropped by a firewall) would never resolve OR reject, so
  // without a timeout the await below — and everything after it, including
  // createControlWindow() — would hang forever.
  try {
    await withTimeout(components.whenReady(), WIDEVINE_INSTALL_TIMEOUT_MS)
  } catch (err) {
    console.error('[main] Widevine component install failed — YouTube/DRM playback will not work', err)
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerPermissionHandlers()
  initDatabase()
  registerSceneIpc()
  registerMediaIpc()
  registerSettingsIpc()
  registerStreamIpc()
  registerDisplayIpc()
  registerCaptureIpc()
  registerMediaProtocolHandler()

  // Output (the physical LED feed) is no longer opened automatically — it's
  // now embedded as a Program monitor inside the Control window, and the
  // real Output window/display is only opened when the operator hits "ส่งไป
  // จอ LED" (see src/main/ipc/display.ts).
  createControlWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow()
    }
  })
})

// Windows uninstall/upgrade has previously failed while ffmpeg child
// processes or the SQLite handle were still holding file locks — release
// both explicitly, and actually wait for ffmpeg's SIGKILL to be processed
// (not just sent), before letting the process exit.
let quitting = false
app.on('before-quit', (event) => {
  if (quitting) return
  event.preventDefault()
  quitting = true
  stopAllStreams()
    .then(() => closeDatabase())
    .finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
