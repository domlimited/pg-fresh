import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './db/database'
import { stopAllStreams } from './media/streamTranscoder'
import { registerCaptureIpc } from './ipc/capture'
import { registerDisplayIpc } from './ipc/display'
import { registerMediaIpc } from './ipc/media'
import { registerPresetIpc } from './ipc/presets'
import { registerSceneIpc } from './ipc/scene'
import { registerSettingsIpc } from './ipc/settings'
import { registerStreamIpc } from './ipc/stream'
import { registerMediaProtocolHandler, registerMediaProtocolPrivileges } from './protocol'
import { registerPermissionHandlers } from './permissions'
import { createControlWindow } from './windows/controlWindow'

registerMediaProtocolPrivileges()

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.fresh.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerPermissionHandlers()
  initDatabase()
  registerSceneIpc()
  registerMediaIpc()
  registerPresetIpc()
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
