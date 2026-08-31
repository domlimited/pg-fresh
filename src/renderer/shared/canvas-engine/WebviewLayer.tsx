import { useEffect, useRef, useState } from 'react'
import type { Layer } from '@common/types/scene'

interface WebviewLayerProps {
  layer: Layer
  role: 'control' | 'output'
  muteAudio?: boolean
}

// Control and Output each load the URL independently in their own
// <webview> guest process — like camera, there's nothing to sync, the page
// is already live in both places. pointer-events-none keeps the guest
// process from swallowing our drag/resize handles (webview owns its own
// input otherwise). Volume isn't controllable per-webview by the platform,
// only mute — Control always stays muted (preview only).
export function WebviewLayer({ layer, role, muteAudio = false }: WebviewLayerProps): JSX.Element {
  const ref = useRef<Electron.WebviewTag>(null)
  const [ready, setReady] = useState(false)

  // Guest-process-dependent methods (setAudioMuted, executeJavaScript, …)
  // throw "Illegal invocation" if called before the guest process attaches
  // — only safe once 'dom-ready' has fired for the current navigation.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setReady(false)

    function onDomReady(): void {
      setReady(true)
    }
    el.addEventListener('dom-ready', onDomReady)
    return () => {
      el.removeEventListener('dom-ready', onDomReady)
    }
  }, [layer.url])

  useEffect(() => {
    const el = ref.current
    if (!el || !ready) return
    el.setAudioMuted(role === 'control' || muteAudio ? true : (layer.muted ?? false))
  }, [ready, role, muteAudio, layer.muted])

  if (!layer.url) {
    return <div className="h-full w-full bg-neutral-900" />
  }

  return <webview ref={ref} src={layer.url} className="pointer-events-none block h-full w-full" />
}
