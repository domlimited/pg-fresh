import { join } from 'path'
import { BrowserWindow, screen } from 'electron'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '@common/ipc-channels'
import type { DisplayInfo, OutputStatus } from '@common/types/display'
import { getControlWindow } from './controlWindow'

// Size of the Output window when there's no real second display to send it
// to (a single-monitor test rig) — a small movable preview instead of a
// fullscreen window covering the operator's own Control window (see
// requirement-v4: the Output window must not block the operator's work).
const SMALL_OUTPUT_WIDTH = 480
const SMALL_OUTPUT_HEIGHT = 270
const SMALL_OUTPUT_MARGIN = 24

let outputWindow: BrowserWindow | null = null
let activeDisplayId: number | null = null
let outputReadyToShow = false
let hiddenByOperator = false
// True only once the window has actually rendered on screen for the
// current activation — distinct from activeDisplayId, which is set the
// moment activation is *requested*. On a cold first activation there's a
// real gap (page load time) between the two; reporting "active" from
// activeDisplayId alone would claim the LED feed is live before the window
// has shown anything. Stays true across a manual setOutputHidden() toggle
// (that's a deliberate operator action on an already-live feed, not a
// reason to report inactive) — only resets on deactivate/close.
let windowActuallyShown = false

export function getOutputWindow(): BrowserWindow | null {
  return outputWindow
}

export function getOutputStatus(): OutputStatus {
  return { active: windowActuallyShown, displayId: activeDisplayId, hidden: hiddenByOperator }
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
    hiddenByOperator = false
    windowActuallyShown = false
    getControlWindow()?.webContents.send(IPC_CHANNELS.OUTPUT_STATUS_UPDATE, getOutputStatus())
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/output/index.html`)
  } else {
    window.loadFile(join(__dirname, '../renderer/output/index.html'))
  }

  return window
}

function boundsForTarget(target: Electron.Display): Electron.Rectangle {
  // Only one physical display exists — there's nowhere else to actually
  // send the LED feed, so covering the whole (only) screen would just bury
  // the Control window underneath it. Use a small corner window instead;
  // the operator can still glance at it, and it never blocks their work.
  if (screen.getAllDisplays().length > 1) return target.bounds
  return {
    x: target.bounds.x + target.bounds.width - SMALL_OUTPUT_WIDTH - SMALL_OUTPUT_MARGIN,
    y: target.bounds.y + SMALL_OUTPUT_MARGIN,
    width: SMALL_OUTPUT_WIDTH,
    height: SMALL_OUTPUT_HEIGHT
  }
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
  window.setBounds(boundsForTarget(target))
  activeDisplayId = displayId
  hiddenByOperator = false

  // showInactive(), not show(): activating Output must never steal OS
  // keyboard focus away from Control — otherwise the operator has to
  // Alt-Tab/click back before hotkeys (Space, etc.) work again every single
  // time they send to LED (see requirement-v4).
  //
  // Avoid a flash of blank content on the LED wall the first time this
  // window is shown — wait for the page to finish loading. On later
  // activations (window already loaded, just previously hidden) this fires
  // immediately since 'ready-to-show' already happened.
  if (outputReadyToShow) {
    window.showInactive()
    windowActuallyShown = true
  } else {
    // On a cold first activation the caller's immediate return value below
    // still reports active:false (windowActuallyShown hasn't flipped yet) —
    // push the real status once it catches up so TopBar doesn't get stuck
    // showing "ส่งไปจอ LED" as if nothing happened.
    window.once('ready-to-show', () => {
      window.showInactive()
      windowActuallyShown = true
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
  hiddenByOperator = false
  windowActuallyShown = false
}

// Lets the operator tuck the real Output window away on demand without
// stopping the LED feed — independent of activateOutput/deactivateOutput,
// which control whether the feed is live at all.
export function setOutputHidden(hidden: boolean): OutputStatus {
  hiddenByOperator = hidden
  if (outputWindow && activeDisplayId !== null) {
    if (hidden) outputWindow.hide()
    else outputWindow.showInactive()
  }
  return getOutputStatus()
}
