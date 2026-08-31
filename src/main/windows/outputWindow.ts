import { join } from 'path'
import { BrowserWindow, screen } from 'electron'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '@common/ipc-channels'
import type { DisplayInfo, OutputStatus } from '@common/types/display'
import { getControlWindow } from './controlWindow'

let outputWindow: BrowserWindow | null = null
let activeDisplayId: number | null = null
let outputReadyToShow = false

export function getOutputWindow(): BrowserWindow | null {
  return outputWindow
}

export function getOutputStatus(): OutputStatus {
  return { active: !!outputWindow && outputWindow.isVisible(), displayId: activeDisplayId }
}

export function listDisplays(): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay()
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: `${d.id === primary.id ? 'จอหลัก' : 'จอภายนอก'} (${d.bounds.width}x${d.bounds.height})`,
    width: d.bounds.width,
    height: d.bounds.height,
    isPrimary: d.id === primary.id
  }))
}

function ensureOutputWindow(): BrowserWindow {
  if (outputWindow) return outputWindow

  const window = new BrowserWindow({
    frame: false,
    show: false,
    title: 'FRESH — Output',
    autoHideMenuBar: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
    }
  })

  outputWindow = window
  outputReadyToShow = false
  window.once('ready-to-show', () => {
    outputReadyToShow = true
  })
  window.on('closed', () => {
    outputWindow = null
    activeDisplayId = null
    outputReadyToShow = false
    getControlWindow()?.webContents.send(IPC_CHANNELS.OUTPUT_STATUS_UPDATE, getOutputStatus())
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/output/index.html`)
  } else {
    window.loadFile(join(__dirname, '../renderer/output/index.html'))
  }

  return window
}

// Sends the output window to a physical display and shows it — this is the
// "ส่งไปจอ LED" action. Not called on app startup: the LED feed now lives
// embedded in the Control window (Program monitor) until the operator
// explicitly activates the real output.
//
// Deliberately does NOT use setFullScreen(): the window is already
// frame:false and sized to exactly cover the target display's bounds, which
// looks identical — and unlike the OS's real fullscreen/Spaces transition,
// plain setBounds() can be re-targeted to a different display instantly,
// with no async animation to race against.
export function activateOutput(displayId: number): DisplayInfo | null {
  const target = screen.getAllDisplays().find((d) => d.id === displayId)
  if (!target) return null

  const window = ensureOutputWindow()
  window.setBounds(target.bounds)
  activeDisplayId = displayId

  // Avoid a flash of blank content on the LED wall the first time this
  // window is shown — wait for the page to finish loading. On later
  // activations (window already loaded, just previously hidden) this fires
  // immediately since 'ready-to-show' already happened.
  if (outputReadyToShow) {
    window.show()
  } else {
    // On a cold first activation the caller's immediate return value below
    // still reports active:false (show() hasn't happened yet) — push the
    // real status once it catches up so TopBar doesn't get stuck showing
    // "ส่งไปจอ LED" as if nothing happened.
    window.once('ready-to-show', () => {
      window.show()
      getControlWindow()?.webContents.send(IPC_CHANNELS.OUTPUT_STATUS_UPDATE, getOutputStatus())
    })
  }

  const primary = screen.getPrimaryDisplay()
  return {
    id: target.id,
    label: `${target.id === primary.id ? 'จอหลัก' : 'จอภายนอก'} (${target.bounds.width}x${target.bounds.height})`,
    width: target.bounds.width,
    height: target.bounds.height,
    isPrimary: target.id === primary.id
  }
}

export function deactivateOutput(): void {
  if (!outputWindow) return
  outputWindow.hide()
  activeDisplayId = null
}
