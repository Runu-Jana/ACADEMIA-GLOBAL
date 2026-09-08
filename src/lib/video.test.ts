import { describe, it, expect } from 'vitest'
import { parseVideoUrl } from './video'

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
      expect(parseVideoUrl(url)).toEqual({ kind: 'youtube', embedUrl: embed })
    }
  })

  it('recognises Vimeo page and player URLs', () => {
    expect(parseVideoUrl('https://vimeo.com/76979871')).toEqual({
      kind: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/76979871',
    })
    expect(parseVideoUrl('https://player.vimeo.com/video/76979871')).toEqual({
      kind: 'vimeo',
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
