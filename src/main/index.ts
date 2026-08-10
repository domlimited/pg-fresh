import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initDatabase } from './db/database'
import { registerMediaIpc } from './ipc/media'
import { registerPresetIpc } from './ipc/presets'
import { registerSceneIpc } from './ipc/scene'
import { registerSettingsIpc } from './ipc/settings'
import { registerStreamIpc } from './ipc/stream'
import { registerMediaProtocolHandler, registerMediaProtocolPrivileges } from './protocol'
import { registerPermissionHandlers } from './permissions'
import { createControlWindow } from './windows/controlWindow'
import { createOutputWindow } from './windows/outputWindow'

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
  registerMediaProtocolHandler()

  createControlWindow()
  createOutputWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow()
      createOutputWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
