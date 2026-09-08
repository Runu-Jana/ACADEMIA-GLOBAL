import { describe, it, expect } from 'vitest'
import { normalizeDrafts } from './assessment'

/**
 * normalizeDrafts is the safety net between raw model output and a saved exam.
 * The property that matters most: the correct answer must follow the option
 * TEXT, never a raw index, so cleaning the list can't silently re-key a
 * question onto the wrong answer.
 */

type Raw = Parameters<typeof normalizeDrafts>[0]

const q = (over: Partial<Raw[number]> = {}): Raw[number] => ({
  text: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctIndex: 1,
  explanation: null,
  ...over,
})

describe('normalizeDrafts', () => {
  it('keeps a clean question and trims its fields', () => {
    const [out] = normalizeDrafts([q({ text: '  What is 2 + 2? ', options: [' 3', '4 ', '5', '6'] })])
    expect(out).toEqual({
      text: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
      explanation: null,
    })
  })

  it('re-points the answer to its text when a blank option above it is dropped', () => {
    // Correct answer is "Beta" at index 2; removing the blank at index 0 must
    // shift the key to index 1, still "Beta" — not leave it pointing at index 2.
    const [out] = normalizeDrafts([q({ options: ['', 'Alpha', 'Beta', 'Gamma'], correctIndex: 2 })])
    expect(out.options).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(out.correctIndex).toBe(1)
    expect(out.options[out.correctIndex]).toBe('Beta')
  })

  it('drops a question whose correctIndex points past the options', () => {
    expect(normalizeDrafts([q({ options: ['A', 'B'], correctIndex: 5 })])).toEqual([])
  })

  it('drops a question whose marked answer is a blank option', () => {
    expect(normalizeDrafts([q({ options: ['A', '', 'C'], correctIndex: 1 })])).toEqual([])
  })

  it('de-duplicates options case-insensitively and re-keys to the survivor', () => {
    const [out] = normalizeDrafts([q({ options: ['Yes', 'yes', 'No', 'no'], correctIndex: 2 })])
    expect(out.options).toEqual(['Yes', 'No'])
    expect(out.options[out.correctIndex]).toBe('No')
  })

  it('drops a question that collapses below two distinct options', () => {
    expect(normalizeDrafts([q({ options: ['Same', 'same', 'SAME'], correctIndex: 0 })])).toEqual([])
  })

  it('drops a question with empty text', () => {
    expect(normalizeDrafts([q({ text: '   ' })])).toEqual([])
  })

  it('normalises a blank explanation to null', () => {
    const [out] = normalizeDrafts([q({ explanation: '   ' })])
    expect(out.explanation).toBeNull()
  })

  it('returns only the valid questions from a mixed batch, in order', () => {
    const out = normalizeDrafts([
      q({ text: 'Keep 1' }),
      q({ text: 'Drop', options: ['A', 'B'], correctIndex: 9 }),
      q({ text: 'Keep 2' }),
    ])
    expect(out.map((d) => d.text)).toEqual(['Keep 1', 'Keep 2'])
  })
})
