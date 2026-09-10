import { prisma } from './prisma'
import { groqChat, groqReadDiagram } from './groq'
import { isPlaceholderContent, readUpload } from './processMedia'
import { diagramHasMarks, pageStudyText } from './diagram'

export type PageRow = {
  id: string
  pageIndex: number
  text: string
  handText?: string | null
  diagram?: unknown
  diagramUrl?: string | null
  ownerUserId: string | null
  ownerName: string | null
  ink?: unknown
}
export type NoteRow = {
  id: string
  pageIndex: number
  pageOwnerId: string | null
  authorId: string
  authorName: string
  content: string
  mediaType: string
  mediaUrl: string | null
  x: number
  y: number
}

export type RevisionSource = {
  id: string
  label: string
  kind: 'page' | 'note' | 'image' | 'voice' | 'diagram'
  ownerName: string
  excerpt: string
}

const clip = (text: string, n = 900) => {
  const t = text.trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

export const readDiagramPages = async (pages: PageRow[]): Promise<Record<string, string>> => {
  const reads: Record<string, string> = {}
  for (const page of pages) {
    if (!page.diagramUrl && !diagramHasMarks(page.diagram)) continue
    if (!page.diagramUrl) continue
    try {
      const file = readUpload(page.diagramUrl)
      if (!file) continue
      const text = await groqReadDiagram(file.buf, file.mime)
      if (text.trim()) reads[page.id] = text.trim()
    } catch (err) {
      console.error('[diagram-read]', page.id, err)
    }
  }
  return reads
}

export const collectSources = (
  pages: PageRow[],
  notes: NoteRow[],
  diagramReads: Record<string, string> = {},
): RevisionSource[] => {
  const sources: RevisionSource[] = []
  let i = 1

  for (const page of pages) {
    const body = pageStudyText(page)
    const figure = (diagramReads[page.id] || '').trim()
    if (!body && !figure && !diagramHasMarks(page.diagram)) continue
    const name = page.ownerName || 'Student'
    const excerpt = [body, figure ? `Diagram:\n${figure}` : ''].filter(Boolean).join('\n\n')
    sources.push({
      id: `S${i++}`,
      label: `${name} · page ${page.pageIndex + 1}`,
      kind: figure ? 'diagram' : 'page',
      ownerName: name,
      excerpt: clip(excerpt || '(diagram on this page)', figure ? 2500 : 1200),
    })
  }

  for (const note of notes) {
    const body = isPlaceholderContent(note.content) ? '' : note.content.trim()
    if (!body && note.mediaType === 'none') continue
    const kind = note.mediaType === 'audio' ? 'voice'
      : note.mediaType === 'image' ? 'image'
      : 'note'
    const kindLabel = kind === 'voice' ? 'lecture audio' : kind === 'image' ? 'photo' : 'slip'
    const name = note.authorName || 'Student'
    sources.push({
      id: `S${i++}`,
      label: `${name} · ${kindLabel}`,
      kind,
      ownerName: name,
      excerpt: clip(body || `(${kindLabel} with no text yet)`),
    })
  }

  return sources
}

export const formatSourcesForPrompt = (sources: RevisionSource[]) =>
  sources.map(s => `[${s.id}] ${s.label}\n${s.excerpt}`).join('\n\n')

export const formatRoomContext = (pages: PageRow[], notes: NoteRow[]) => {
  const sources = collectSources(pages, notes)
  return formatSourcesForPrompt(sources)
}

export const buildRoomSources = async (roomId: string, opts?: { readDiagrams?: boolean }) => {
  const [pages, notes] = await Promise.all([
    prisma.page.findMany({ where: { roomId }, orderBy: { pageIndex: 'asc' } }),
    prisma.note.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } }),
  ])
  const diagramReads = opts?.readDiagrams ? await readDiagramPages(pages) : {}
  const sources = collectSources(pages, notes, diagramReads)
  return { pages, notes, sources, context: formatSourcesForPrompt(sources) }
}

export const buildRoomContext = async (roomId: string) => {
  const { context } = await buildRoomSources(roomId)
  return context
}

export const parseJsonLoose = (text: string) => {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('No JSON in model output')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export const studioFromModel = async (sources: RevisionSource[]) => {
  const catalog = formatSourcesForPrompt(sources)
  const raw = await groqChat(
    `You compile a class study studio from numbered sources of the SAME lecture.
Handwriting is already transcribed as text. Some sources include a compact diagram description.
Return ONLY JSON with keys:
title, guide, glossary, faq, quiz, gaps, audioScript
Rules:
- guide: markdown study notes. Cite claims like [S1]. Merge overlapping voice transcripts. Prefer points in more than one source.
- Put diagram descriptions into the guide (what the figure shows). Reconstruct tables as markdown.
- glossary: [{ "term", "definition", "sourceIds": ["S1"] }]
- faq: [{ "q", "a", "sourceIds": ["S1"] }]
- quiz: [{ "q", "a", "sourceIds": ["S1"] }] 6-10 active-recall questions
- gaps: [{ "text", "who" }] facts only one student had
- audioScript: a spoken briefing, two hosts (Alex then Sam), under 1200 characters, no citations, no stage directions except the names as "Alex:" / "Sam:"
- Every factual sentence in guide/faq/quiz must cite at least one source id
- No preamble`,
    [{ role: 'user', content: `Sources:\n\n${catalog}` }],
    4500
  )
  const data = parseJsonLoose(raw)
  const asList = (v: unknown) => Array.isArray(v) ? v : []
  return {
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Class revision',
    guide: typeof data.guide === 'string' ? data.guide : '',
    glossary: asList(data.glossary),
    faq: asList(data.faq),
    quiz: asList(data.quiz),
    gaps: asList(data.gaps),
    audioScript: typeof data.audioScript === 'string' ? data.audioScript : '',
  }
}
