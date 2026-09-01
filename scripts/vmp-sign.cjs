const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// electron-builder afterPack hook — VMP-signs the packaged app with
// castlabs' EVS service so the bundled Widevine CDM (see package.json's
// `electron` dependency — castlabs/electron-releases, not stock Electron)
// is trusted by real DRM license servers (YouTube's, etc.), not just
// test/UAT ones. Without this, DRM playback still fails with a generic
// "video unavailable" error even though the CDM itself installs and reports
// as available — see docs/requirement-v4/detail.md for the full story.
//
// Prerequisites (one-time, per machine that builds a release):
//   python3 -m venv .evs-venv && .evs-venv/bin/pip install castlabs-evs
//   .evs-venv/bin/python -m castlabs_evs.account signup   (or `reauth` if you already have one)
// (a project-local venv, not a global pip install, because most systems now
// block unmanaged global pip installs — see PEP 668)
// https://github.com/castlabs/electron-releases/wiki/EVS
//
// Prefers the project-local .evs-venv if it exists (created above), falling
// back to whatever `python3` resolves to on PATH otherwise.
function resolvePython() {
  const venvPython =
    process.platform === 'win32'
      ? path.join(__dirname, '..', '.evs-venv', 'Scripts', 'python.exe')
      : path.join(__dirname, '..', '.evs-venv', 'bin', 'python3')
  return fs.existsSync(venvPython) ? venvPython : 'python3'
}
//
// Timing matters if this app ever adds real code-signing: castlabs requires
// VMP-signing to happen BEFORE code-signing on macOS but AFTER it on
// Windows. This app is currently unsigned on both platforms, so running
// here in afterPack (which fires before electron-builder's own signing
// step) is safe for both — revisit this if win.certificateFile or
// mac.identity ever get configured.
//
// Deliberately never fails the build: signing is only required for
// DRM/YouTube playback, not for the app's actual job of driving the LED
// wall — a missing/expired EVS login should degrade to "YouTube doesn't
// work in this build", not "the build doesn't exist".
exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName } = context

  // Linux's Widevine CDM has no VMP support and needs no signature at all.
  if (electronPlatformName !== 'darwin' && electronPlatformName !== 'win32') return

  const python = resolvePython()
  console.log(`[vmp-sign] Signing ${appOutDir} for Widevine (castlabs EVS, using ${python})...`)
  const result = spawnSync(python, ['-m', 'castlabs_evs.vmp', 'sign-pkg', appOutDir], {
    stdio: 'inherit'
  })

  if (result.error || result.status !== 0) {
    console.warn(
      '[vmp-sign] VMP signing skipped/failed — this build will work for everything except ' +
        'DRM/YouTube playback.\n' +
        '  Set up: python3 -m venv .evs-venv && .evs-venv/bin/pip install castlabs-evs\n' +
        '  Log in: .evs-venv/bin/python -m castlabs_evs.account reauth\n' +
        '  Docs:   https://github.com/castlabs/electron-releases/wiki/EVS'
    )
  }
}
