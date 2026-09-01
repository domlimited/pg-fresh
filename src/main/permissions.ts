import { session } from 'electron'

const ALLOWED_PERMISSIONS = new Set([
  // Camera/mic access for the Camera layer (Phase 5) — OS-level consent,
  // e.g. macOS TCC, still applies on top of this and can't be granted
  // programmatically.
  'media',
  // Separate from 'media' — this is what actually gates EME/DRM playback
  // (Widevine license requests) for the "เว็บ / สตรีม" webview layer's
  // YouTube embeds. Without it, Electron silently denies the permission and
  // the player just reports the video as unavailable without ever making a
  // playback/license network call — no thrown error, no obvious signal.
  'mediaKeySystem'
])

// Electron denies unhandled permission requests in packaged builds unless a
// handler explicitly allows them.
export function registerPermissionHandlers(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission))
  })
}
