import { session } from 'electron'

// Electron denies unhandled permission requests in packaged builds unless a
// handler explicitly allows them — camera/mic access for Phase 5's Camera
// layer needs 'media' allowed here (OS-level camera consent, e.g. macOS
// TCC, still applies on top of this and can't be granted programmatically).
export function registerPermissionHandlers(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media')
  })
}
