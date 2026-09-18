import { describe, it, expect } from 'vitest'
import { parseVideoUrl, resolveLessonVideo, isDownloadable, downloadUrlOf } from './video'

describe('parseVideoUrl', () => {
  it('recognises YouTube in its many forms and rebuilds a canonical embed', () => {
    const embed = 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0'
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    ]) {
      expect(parseVideoUrl(url)).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ', embedUrl: embed })
    }
  })

  it('recognises Vimeo page and player URLs', () => {
    expect(parseVideoUrl('https://vimeo.com/76979871')).toEqual({
      kind: 'vimeo',
      id: '76979871',
      embedUrl: 'https://player.vimeo.com/video/76979871',
    })
    expect(parseVideoUrl('https://player.vimeo.com/video/76979871')).toEqual({
      kind: 'vimeo',
      id: '76979871',
      embedUrl: 'https://player.vimeo.com/video/76979871',
    })
  })

  it('recognises direct media files, including with a query string', () => {
    expect(parseVideoUrl('https://cdn.example.com/lessons/intro.mp4')).toEqual({
      kind: 'file',
      fileUrl: 'https://cdn.example.com/lessons/intro.mp4',
    })
    expect(parseVideoUrl('https://cdn.example.com/a.webm?token=xyz')).toEqual({
      kind: 'file',
      fileUrl: 'https://cdn.example.com/a.webm?token=xyz',
    })
  })

  it('treats empty, non-URL, non-http, and unknown hosts as unknown', () => {
    expect(parseVideoUrl('')).toEqual({ kind: 'unknown' })
    expect(parseVideoUrl(null)).toEqual({ kind: 'unknown' })
    expect(parseVideoUrl('not a url')).toEqual({ kind: 'unknown' })
    expect(parseVideoUrl('javascript:alert(1)')).toEqual({ kind: 'unknown' })
    expect(parseVideoUrl('https://example.com/page')).toEqual({ kind: 'unknown' })
  })

  it('rejects a YouTube URL whose id is the wrong length', () => {
    expect(parseVideoUrl('https://youtu.be/tooShort')).toEqual({ kind: 'unknown' })
  })
})

describe('resolveLessonVideo', () => {
  it('prefers a managed HLS stream over the legacy contentUrl and is downloadable only with a downloadUrl', () => {
    const withDownload = resolveLessonVideo({
      type: 'VIDEO',
      contentUrl: 'https://youtu.be/dQw4w9WgXcQ',
      streamUrl: 'https://cdn.example.com/x/playlist.m3u8',
      downloadUrl: 'https://cdn.example.com/x/video.mp4',
      posterUrl: 'https://cdn.example.com/x/thumb.jpg',
      videoProvider: 'bunny',
    })
    expect(withDownload).toEqual({
      kind: 'hls',
      src: 'https://cdn.example.com/x/playlist.m3u8',
      poster: 'https://cdn.example.com/x/thumb.jpg',
      downloadUrl: 'https://cdn.example.com/x/video.mp4',
      provider: 'bunny',
    })
    expect(isDownloadable(withDownload)).toBe(true)
    expect(downloadUrlOf(withDownload)).toBe('https://cdn.example.com/x/video.mp4')

    const streamOnly = resolveLessonVideo({ type: 'VIDEO', streamUrl: 'https://cdn.example.com/x.m3u8' })
    expect(isDownloadable(streamOnly)).toBe(false)
  })

  it('falls back to contentUrl; YouTube/Vimeo are never downloadable, a direct file is', () => {
    const yt = resolveLessonVideo({ type: 'VIDEO', contentUrl: 'https://youtu.be/dQw4w9WgXcQ' })
    expect(yt.kind).toBe('youtube')
    expect(isDownloadable(yt)).toBe(false)

    const file = resolveLessonVideo({ type: 'VIDEO', contentUrl: 'https://cdn.example.com/a.mp4' })
    expect(isDownloadable(file)).toBe(true)
    expect(downloadUrlOf(file)).toBe('https://cdn.example.com/a.mp4')
  })

  it('treats LIVE lessons and empty sources as unknown', () => {
    expect(resolveLessonVideo({ type: 'LIVE', streamUrl: 'https://x/y.m3u8' })).toEqual({ kind: 'unknown' })
    expect(resolveLessonVideo({ type: 'VIDEO', contentUrl: null })).toEqual({ kind: 'unknown' })
  })
})
