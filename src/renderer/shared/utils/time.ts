export function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = Math.floor(safe % 60)
  // Hours only appear once there are any — a 90-minute clip used to read
  // "90:00", which is indistinguishable from 90 seconds at a glance.
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// <video>.duration is NaN before metadata arrives and Infinity for live
// sources; fall back to what ffprobe measured at import time so the transport
// shows the real length instead of 0:00.
export function resolveDuration(el: HTMLVideoElement | null | undefined, fallbackSec?: number): number {
  const duration = el?.duration
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) return duration
  return fallbackSec ?? 0
}
