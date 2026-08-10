import { join } from 'path'
import { BrowserWindow, screen } from 'electron'
import { is } from '@electron-toolkit/utils'

let outputWindow: BrowserWindow | null = null

export function getOutputWindow(): BrowserWindow | null {
  return outputWindow
}

export function createOutputWindow(): BrowserWindow {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  const target = displays.find((d) => d.id !== primary.id) ?? primary

  const window = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
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
  window.on('closed', () => {
    outputWindow = null
  })

  window.on('ready-to-show', () => window.show())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/output/index.html`)
  } else {
    window.loadFile(join(__dirname, '../renderer/output/index.html'))
  }

  return window
}
