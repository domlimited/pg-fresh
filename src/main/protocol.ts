import { net, protocol } from 'electron'

const MEDIA_SCHEME = 'media'

// http://localhost (dev server) and file:// (packaged build) renderer
// origins are both blocked from loading raw file:// media by Chromium's
// cross-scheme restrictions. A privileged custom scheme sidesteps that in
// both cases and still supports Range requests for video seeking.
export function registerMediaProtocolPrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
    }
  ])
}

const HOST_PREFIX = `${MEDIA_SCHEME}://local`

export function registerMediaProtocolHandler(): void {
  protocol.handle(MEDIA_SCHEME, (request) => {
    // Strip "media://local" and reattach "file:" — the remaining path is
    // already pathToFileURL-encoded (see preload's toMediaUrl), so this is
    // a plain scheme swap, not a re-parse.
    const filePathPart = request.url.slice(HOST_PREFIX.length)
    return net.fetch(`file://${filePathPart}`, { headers: request.headers })
  })
}
