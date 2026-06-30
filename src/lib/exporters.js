// Export a markdown-ish report to .docx (via the `docx` lib) or .pdf (via jsPDF).
// Both consume the same parsed block list so the two formats stay consistent.
//
// docx and jspdf are heavy and only needed on export, so they're loaded lazily
// via dynamic import() — this keeps them out of the main bundle.

const stripBold = (s) => s.replace(/\*\*/g, '')

// Parse the AI markdown into a flat list of blocks.
export function parseBlocks(md) {
  const blocks = []
  for (const raw of (md || '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#### ')) blocks.push({ type: 'h4', text: line.slice(5) })
    else if (line.startsWith('### ')) blocks.push({ type: 'h3', text: line.slice(4) })
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) })
    else if (line.startsWith('# ')) blocks.push({ type: 'h1', text: line.slice(2) })
    else if (/^[-*]\s+/.test(line)) blocks.push({ type: 'li', text: line.replace(/^[-*]\s+/, '') })
    else blocks.push({ type: 'p', text: line })
  }
  return blocks
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Split "**bold**" segments into docx TextRuns.
function docxRuns(TextRun, text) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**')
        ? new TextRun({ text: part.slice(2, -2), bold: true })
        : new TextRun(part),
    )
}

export async function downloadDocx({ title, subtitle, blocks, filename }) {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import('docx')

  const children = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })]
  if (subtitle) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: subtitle, italics: true, color: '64748B' })] }),
    )
  }
  children.push(new Paragraph({ text: '' }))

  for (const b of blocks) {
    if (b.type === 'h1') children.push(new Paragraph({ text: stripBold(b.text), heading: HeadingLevel.HEADING_1 }))
    else if (b.type === 'h2') children.push(new Paragraph({ text: stripBold(b.text), heading: HeadingLevel.HEADING_1, spacing: { before: 200 } }))
    else if (b.type === 'h3') children.push(new Paragraph({ text: stripBold(b.text), heading: HeadingLevel.HEADING_2 }))
    else if (b.type === 'h4') children.push(new Paragraph({ text: stripBold(b.text), heading: HeadingLevel.HEADING_3 }))
    else if (b.type === 'li') children.push(new Paragraph({ children: docxRuns(TextRun, b.text), bullet: { level: 0 } }))
    else children.push(new Paragraph({ children: docxRuns(TextRun, b.text), spacing: { after: 120 } }))
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, filename)
}

export async function downloadPdf({ title, subtitle, blocks, filename }) {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 56
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const maxW = pageW - margin * 2
  let y = margin

  const ensure = (h) => {
    if (y + h > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const write = (text, { size, style = 'normal', gapAfter = 6, color = [30, 41, 59], indent = 0 }) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    const lines = doc.splitTextToSize(text, maxW - indent)
    const lineH = size * 1.35
    for (const ln of lines) {
      ensure(lineH)
      doc.text(ln, margin + indent, y)
      y += lineH
    }
    y += gapAfter
  }

  write(title, { size: 20, style: 'bold', gapAfter: 4 })
  if (subtitle) write(subtitle, { size: 10, style: 'italic', color: [100, 116, 139], gapAfter: 14 })

  for (const b of blocks) {
    const text = stripBold(b.text)
    if (b.type === 'h1') write(text, { size: 16, style: 'bold', gapAfter: 6 })
    else if (b.type === 'h2') write(text, { size: 13.5, style: 'bold', gapAfter: 5, color: [15, 23, 42] })
    else if (b.type === 'h3') write(text, { size: 11.5, style: 'bold', gapAfter: 4, color: [67, 56, 202] })
    else if (b.type === 'h4') write(text, { size: 10.5, style: 'bold', gapAfter: 3 })
    else if (b.type === 'li') write(`•  ${text}`, { size: 10.5, gapAfter: 3, indent: 10 })
    else write(text, { size: 10.5, gapAfter: 8 })
  }

  doc.save(filename)
}
