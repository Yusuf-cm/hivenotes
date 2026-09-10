import { colFromX, insertOnRuledLine, lineIndexFromY } from './pageLines'

export const insertOnRuledPage = (
  textarea: HTMLTextAreaElement,
  text: string,
  word: string,
  xNorm: number,
  yNorm: number,
): string => {
  const h = Math.max(1, textarea.clientHeight)
  const w = Math.max(1, textarea.clientWidth)
  const cs = getComputedStyle(textarea)
  const line = lineIndexFromY(yNorm, h)
  const padL = parseFloat(cs.paddingLeft) || 84
  const col = colFromX(xNorm, w, `${cs.fontSize} ${cs.fontFamily}`, padL)
  return insertOnRuledLine(text, word, line, col)
}
