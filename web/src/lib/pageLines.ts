export const LINE_H = 28
export const MARGIN_LEFT = 84

export const lineIndexFromY = (yNorm: number, heightPx: number) =>
  Math.max(0, Math.floor((yNorm * Math.max(1, heightPx)) / LINE_H))

export const colFromX = (xNorm: number, widthPx: number, font: string, marginLeft = MARGIN_LEFT) => {
  const w = Math.max(1, widthPx)
  const x = xNorm * w
  const ctx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  if (!ctx) return Math.max(0, Math.round((x - marginLeft) / 10))
  ctx.font = font
  const nw = Math.max(7, ctx.measureText('n').width)
  return Math.max(0, Math.round((x - marginLeft) / nw))
}

/** Put words on one ruled row. Never wrap or shift text already on other rows. */
export const insertOnRuledLine = (text: string, word: string, line: number, col: number) => {
  const addition = word.replace(/\s+/g, ' ').trim()
  if (!addition) return text
  const rowIndex = Math.max(0, line)
  const lines = text.split('\n')
  while (lines.length <= rowIndex) lines.push('')
  const row = lines[rowIndex]
  if (!row) {
    lines[rowIndex] = ' '.repeat(col) + addition
  } else if (col > row.length) {
    lines[rowIndex] = `${row}${' '.repeat(col - row.length)}${addition}`
  } else {
    const gap = row.endsWith(' ') ? '' : ' '
    lines[rowIndex] = `${row}${gap}${addition}`
  }
  return lines.join('\n')
}
