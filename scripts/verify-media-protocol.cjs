// Verifies the media:// protocol handler's HTTP contract (src/main/protocol.ts).
//
// Why this exists: Chromium's media stack decides whether a video is seekable
// — and therefore whether a long clip plays at all and reports the right
// duration — purely from Accept-Ranges / Content-Range / Content-Length on
// these responses. Getting that wrong fails silently: the video just shows a
// wrong duration or never starts, with nothing in the console. See
// docs/requirement-v5/plan.md Phase A.
//
// Run with:  ./node_modules/.bin/electron scripts/verify-media-protocol.cjs
//
// Bundles the real protocol.ts on the fly (rather than testing a copy of the
// logic) and runs it against a throwaway userData dir, so the operator's own
// library and settings are never touched.

const { execFileSync } = require('child_process')
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('fs')
const { tmpdir } = require('os')
const { join } = require('path')
const { pathToFileURL } = require('url')
const { app, net } = require('electron')

const ROOT = join(__dirname, '..')
const workDir = mkdtempSync(join(tmpdir(), 'fresh-protocol-verify-'))
const userDataDir = join(workDir, 'userData')
mkdirSync(userDataDir, { recursive: true })

// --- Bundle the module under test -------------------------------------------

// The bundle must sit inside the project tree, not the temp dir: it keeps a
// require('better-sqlite3') for the native module, which only resolves from a
// path underneath the project's node_modules.
const cacheDir = join(ROOT, 'node_modules/.cache/fresh-media-protocol-verify')
mkdirSync(cacheDir, { recursive: true })
const bundlePath = join(cacheDir, 'protocol.bundle.cjs')
const entryPath = join(workDir, 'entry.ts')
writeFileSync(
  entryPath,
  `export * from ${JSON.stringify(join(ROOT, 'src/main/protocol.ts'))}\n` +
    `export { initDatabase } from ${JSON.stringify(join(ROOT, 'src/main/db/database.ts'))}\n` +
    `export { insertMedia } from ${JSON.stringify(join(ROOT, 'src/main/db/repositories/mediaLibrary.ts'))}\n`
)

execFileSync(
  join(ROOT, 'node_modules/.bin/esbuild'),
  [
    entryPath,
    '--bundle',
    '--platform=node',
    '--format=cjs',
    '--external:electron',
    '--external:better-sqlite3',
    '--log-level=warning',
    `--outfile=${bundlePath}`
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] }
)

const { registerMediaProtocolPrivileges, registerMediaProtocolHandler, initDatabase, insertMedia } =
  require(bundlePath)

// registerSchemesAsPrivileged must run before the app is ready.
registerMediaProtocolPrivileges()
app.setPath('userData', userDataDir)

// --- Fixtures ----------------------------------------------------------------

const FFMPEG = require(join(ROOT, 'node_modules/ffmpeg-static'))

const mediaDir = join(workDir, 'media')
mkdirSync(mediaDir, { recursive: true })

// A filename with a space and Thai characters, to prove the percent-encoding
// round-trip through pathToFileURL (preload) and fileURLToPath (handler).
const videoPath = join(mediaDir, 'คลิป ทดสอบ.mp4')
const playlistPath = join(userDataDir, 'hls', 'demo', 'playlist.m3u8')
const thumbnailPath = join(userDataDir, 'thumbnails', 'demo.jpg')
const missingPath = join(mediaDir, 'not-on-disk.mp4')
const forbiddenPath = join(workDir, 'secret.mp4')

execFileSync(FFMPEG, [
  '-y', '-loglevel', 'error',
  '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30', '-t', '12',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  videoPath
])

mkdirSync(join(userDataDir, 'hls', 'demo'), { recursive: true })
mkdirSync(join(userDataDir, 'thumbnails'), { recursive: true })
writeFileSync(playlistPath, '#EXTM3U\n#EXT-X-VERSION:3\n')
writeFileSync(thumbnailPath, 'not-really-a-jpeg')
writeFileSync(forbiddenPath, 'should never be served')

const videoBytes = readFileSync(videoPath)
const videoSize = videoBytes.length

function toMediaUrl(absolutePath) {
  // Mirrors preload's toMediaUrl (src/preload/index.ts).
  return `media://local${pathToFileURL(absolutePath).href.slice('file://'.length)}`
}

// --- Assertions ---------------------------------------------------------------

let passed = 0
const failures = []

function check(label, condition, detail) {
  if (condition) {
    passed += 1
    console.log(`  ok   ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

async function request(path, init) {
  const res = await net.fetch(toMediaUrl(path), init)
  const body = Buffer.from(await res.arrayBuffer())
  return { status: res.status, headers: res.headers, body }
}

async function run() {
  console.log(`\nmedia:// protocol contract (fixture: ${videoSize} bytes)\n`)

  {
    const r = await request(videoPath)
    check('GET (no Range) → 200', r.status === 200, `got ${r.status}`)
    check('GET advertises Accept-Ranges: bytes', r.headers.get('accept-ranges') === 'bytes', String(r.headers.get('accept-ranges')))
    check('GET sends Content-Length', r.headers.get('content-length') === String(videoSize), String(r.headers.get('content-length')))
    check('GET sets video/mp4', r.headers.get('content-type') === 'video/mp4', String(r.headers.get('content-type')))
    check('GET returns whole file', r.body.length === videoSize, `${r.body.length} bytes`)
    check('GET decodes spaces + Thai in filename', r.body.equals(videoBytes))
  }

  {
    const r = await request(videoPath, { headers: { Range: 'bytes=0-99' } })
    check('Range bytes=0-99 → 206', r.status === 206, `got ${r.status}`)
    check('Range bytes=0-99 Content-Range', r.headers.get('content-range') === `bytes 0-99/${videoSize}`, String(r.headers.get('content-range')))
    check('Range bytes=0-99 Content-Length', r.headers.get('content-length') === '100', String(r.headers.get('content-length')))
    check('Range bytes=0-99 body matches file head', r.body.equals(videoBytes.subarray(0, 100)))
  }

  {
    const r = await request(videoPath, { headers: { Range: 'bytes=1000-' } })
    check('Open-ended Range bytes=1000- → 206', r.status === 206, `got ${r.status}`)
    check('Open-ended Range Content-Range', r.headers.get('content-range') === `bytes 1000-${videoSize - 1}/${videoSize}`, String(r.headers.get('content-range')))
    // The offset is the thing that actually broke playback before: the old
    // handler returned the right *bytes* with a 200, so Chromium wrote them at
    // the wrong buffer position. Compare content, not just length.
    check('Open-ended Range body starts at byte 1000', r.body.equals(videoBytes.subarray(1000)))
  }

  {
    const r = await request(videoPath, { headers: { Range: 'bytes=-500' } })
    check('Suffix Range bytes=-500 → 206', r.status === 206, `got ${r.status}`)
    check('Suffix Range Content-Range', r.headers.get('content-range') === `bytes ${videoSize - 500}-${videoSize - 1}/${videoSize}`, String(r.headers.get('content-range')))
    check('Suffix Range body matches file tail', r.body.equals(videoBytes.subarray(videoSize - 500)))
  }

  {
    // Chromium routinely asks for more than the file holds while probing.
    const r = await request(videoPath, { headers: { Range: `bytes=0-${videoSize + 5000}` } })
    check('Over-long Range clamps to EOF', r.status === 206 && r.headers.get('content-range') === `bytes 0-${videoSize - 1}/${videoSize}`, `${r.status} ${r.headers.get('content-range')}`)
  }

  {
    const r = await request(videoPath, { headers: { Range: 'bytes=999999999-' } })
    check('Unsatisfiable Range → 416', r.status === 416, `got ${r.status}`)
    check('416 reports total size', r.headers.get('content-range') === `bytes */${videoSize}`, String(r.headers.get('content-range')))
  }

  {
    const r = await request(videoPath, { headers: { Range: 'bytes=abc' } })
    check('Unparseable Range falls back to 200', r.status === 200 && r.body.length === videoSize, `${r.status}, ${r.body.length} bytes`)
  }

  {
    const r = await request(videoPath, { method: 'HEAD' })
    check('HEAD → 200 with Content-Length, no body', r.status === 200 && r.headers.get('content-length') === String(videoSize) && r.body.length === 0, `${r.status}, ${r.body.length} bytes`)
  }

  {
    const r = await request(playlistPath)
    check('HLS playlist Content-Type', r.headers.get('content-type') === 'application/vnd.apple.mpegurl', String(r.headers.get('content-type')))
    check('HLS playlist is never cached', r.headers.get('cache-control') === 'no-store', String(r.headers.get('cache-control')))
  }

  {
    const r = await request(thumbnailPath)
    check('userData asset is servable without a library row', r.status === 200, `got ${r.status}`)
  }

  {
    const r = await request(forbiddenPath)
    check('Path outside library + userData → 403', r.status === 403, `got ${r.status}`)
  }

  {
    const r = await request(missingPath)
    check('Library row with no file on disk → 404', r.status === 404, `got ${r.status}`)
  }
}

app.whenReady().then(async () => {
  initDatabase()

  const now = Date.now()
  const row = (id, path, thumb) => ({
    id, path, displayPath: path, kind: 'video', name: id,
    durationSec: 12, width: 320, height: 180, thumbnailPath: thumb,
    needsTranscode: false, transcodeStatus: 'none', createdAt: now
  })
  insertMedia(row('fixture', videoPath, null))
  // Present in the library, deliberately absent from disk — proves 404 rather
  // than the 403 an unknown path would get.
  insertMedia(row('missing', missingPath, null))

  registerMediaProtocolHandler()

  try {
    await run()
  } catch (err) {
    failures.push(`threw: ${err && err.stack}`)
  }

  console.log(`\n${passed} passed, ${failures.length} failed`)
  if (failures.length) failures.forEach((f) => console.log(`  - ${f}`))

  rmSync(workDir, { recursive: true, force: true })
  rmSync(cacheDir, { recursive: true, force: true })
  app.exit(failures.length ? 1 : 0)
})
