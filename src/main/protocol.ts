import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { extname, resolve, sep } from 'path'
import { Readable } from 'stream'
import { fileURLToPath } from 'url'
import { app, protocol } from 'electron'
import { isKnownMediaPath } from './db/repositories/mediaLibrary'

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

// Chromium's media stack picks its demuxer from Content-Type alone — there
// is no sniffing fallback for <video>/<audio>, so an extension missing from
// this table plays as a black frame with no error. Serving the file used to
// go through net.fetch('file://…'), which guessed the type for us; reading
// the file ourselves (required for Range support, see below) means we own
// that mapping now.
const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  // HLS — StreamLayer serves the transcoder's playlist and segments through
  // this same scheme (see src/main/media/streamTranscoder.ts).
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.m4s': 'video/iso.segment',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav'
}

// A live HLS playlist is rewritten in place every couple of seconds, and its
// segments are recycled by ffmpeg's delete_segments — anything cached from
// that directory is stale by definition.
const NO_STORE_EXTENSIONS = new Set(['.m3u8', '.ts', '.m4s'])

function getMimeType(filePath: string, ext: string): string {
  const mime = MIME_TYPES[ext]
  if (mime) return mime
  console.warn(`[protocol] no MIME mapping for "${ext}" (${filePath}) — serving as octet-stream`)
  return 'application/octet-stream'
}

// The "เว็บ / สตรีม" source loads arbitrary third-party pages in a <webview>,
// and this scheme is corsEnabled + supportFetchAPI — so any page the operator
// opens can fetch media:// URLs. Without this check that's a read primitive
// for every file the app's user account can see. Two roots are legitimate:
// files the operator explicitly imported (tracked in media_library) and the
// app's own generated assets under userData (thumbnails/, transcoded/, hls/).
function isServablePath(filePath: string): boolean {
  const userData = resolve(app.getPath('userData'))
  if (filePath === userData || filePath.startsWith(userData + sep)) return true

  try {
    return isKnownMediaPath(filePath)
  } catch (err) {
    // Database not initialized yet (or already closed during shutdown) —
    // fail closed rather than serving an unvetted path.
    console.error('[protocol] media library lookup failed', err)
    return false
  }
}

interface ByteRange {
  start: number
  end: number
}

// Parses a single-range "Range: bytes=…" header against a known file size.
// Returns null when there's no usable range (no header / syntax this handler
// doesn't implement, e.g. multipart), or 'unsatisfiable' when the header
// parses but points outside the file — those two cases mean 200 and 416
// respectively, which are very different answers.
function parseRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null {
  if (!header) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null

  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return null

  // Suffix form ("bytes=-500" = the last 500 bytes). Asking for more bytes
  // than the file holds is legal here and means "the whole file".
  if (rawStart === '') {
    const suffixLength = Number(rawEnd)
    if (suffixLength === 0) return 'unsatisfiable'
    return { start: Math.max(0, size - suffixLength), end: size - 1 }
  }

  const start = Number(rawStart)
  if (start >= size) return 'unsatisfiable'

  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1)
  if (end < start) return 'unsatisfiable'

  return { start, end }
}

function fileStream(filePath: string, range?: ByteRange): ReadableStream<Uint8Array> {
  const stream = createReadStream(filePath, range)
  // Chromium abandons in-flight range requests constantly while seeking; the
  // resulting EPIPE/premature-close lands on this stream as an 'error' event,
  // which is fatal to the main process if nothing is listening for it.
  stream.on('error', (err) => {
    console.error(`[protocol] read failed for ${filePath}`, err)
  })
  return Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>
}

export function registerMediaProtocolHandler(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    let filePath: string

    try {
      // Percent-decoding belongs to fileURLToPath, not to us — the path was
      // encoded by pathToFileURL in the preload (see toMediaUrl), so spaces
      // and non-ASCII names arrive as %XX and must be decoded exactly once.
      // Going through URL.pathname also drops any query/hash before decoding.
      filePath = resolve(fileURLToPath(`file://${new URL(request.url).pathname}`))
    } catch (err) {
      console.error(`[protocol] malformed media URL: ${request.url}`, err)
      return new Response(null, { status: 400 })
    }

    if (!isServablePath(filePath)) {
      console.error(`[protocol] refused to serve path outside the media library: ${filePath}`)
      return new Response(null, { status: 403 })
    }

    let size: number
    try {
      const stats = await stat(filePath)
      if (!stats.isFile()) return new Response(null, { status: 404 })
      size = stats.size
    } catch {
      console.error(`[protocol] file not found: ${filePath}`)
      return new Response(null, { status: 404 })
    }

    const ext = extname(filePath).toLowerCase()
    const headers: Record<string, string> = {
      'Content-Type': getMimeType(filePath, ext),
      // Advertised on every response, not just 206s: Chromium decides whether
      // a media resource is seekable from this header on the FIRST (rangeless)
      // request. The old handler never sent it, so every clip was treated as
      // an unseekable stream — setting el.currentTime fired a 'seeked' event
      // and then silently landed back at 0 (measured on a 30-min clip, see
      // docs/requirement-v5/plan.md).
      'Accept-Ranges': 'bytes'
    }
    if (NO_STORE_EXTENSIONS.has(ext)) headers['Cache-Control'] = 'no-store'

    const range = parseRange(request.headers.get('Range'), size)

    if (range === 'unsatisfiable') {
      return new Response(null, {
        status: 416,
        headers: { ...headers, 'Content-Range': `bytes */${size}` }
      })
    }

    if (range) {
      const rangeHeaders = {
        ...headers,
        'Content-Length': String(range.end - range.start + 1),
        'Content-Range': `bytes ${range.start}-${range.end}/${size}`
      }
      if (request.method === 'HEAD') return new Response(null, { status: 206, headers: rangeHeaders })
      return new Response(fileStream(filePath, range), { status: 206, headers: rangeHeaders })
    }

    const fullHeaders = { ...headers, 'Content-Length': String(size) }
    if (request.method === 'HEAD') return new Response(null, { status: 200, headers: fullHeaders })
    return new Response(fileStream(filePath), { status: 200, headers: fullHeaders })
  })
}
