const YOUTUBE_PATTERN = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i

// youtube.com/watch?v=X loads the full page (chrome, ads, comments); the
// embed form gives a clean autoplaying player, closer to what a signage
// layer actually wants.
export function normalizeWebUrl(url: string): string {
  const match = url.match(YOUTUBE_PATTERN)
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1`
  }
  return url
}

export function isStreamUrl(url: string): boolean {
  return /^rtsp:\/\//i.test(url) || /^rtmp:\/\//i.test(url)
}
