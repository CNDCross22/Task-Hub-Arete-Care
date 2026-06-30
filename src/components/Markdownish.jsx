import { Fragment } from 'react'

// Tiny markdown renderer: supports ## / # headings, - and * bullets, and **bold**.
// Enough for short AI summaries without pulling in a markdown library.

function inline(text, keyBase) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyBase}-${i}`} className="font-semibold text-slate-800">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>
    ),
  )
}

export default function Markdownish({ text }) {
  const lines = (text || '').split('\n')
  const blocks = []
  let bullets = []

  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          {bullets.map((b, i) => (
            <li key={i}>{inline(b, `li-${blocks.length}-${i}`)}</li>
          ))}
        </ul>,
      )
      bullets = []
    }
  }

  lines.forEach((raw, idx) => {
    const line = raw.trim()
    if (!line) {
      flush()
      return
    }
    if (line.startsWith('#### ')) {
      flush()
      blocks.push(
        <h5 key={`h-${idx}`} className="mt-2 text-sm font-semibold text-slate-800">
          {line.slice(5)}
        </h5>,
      )
    } else if (line.startsWith('### ')) {
      flush()
      blocks.push(
        <h4 key={`h-${idx}`} className="mt-3 text-sm font-bold uppercase tracking-wide text-brand-700">
          {line.slice(4)}
        </h4>,
      )
    } else if (line.startsWith('## ')) {
      flush()
      blocks.push(
        <h3
          key={`h-${idx}`}
          className="mt-5 border-b border-slate-200 pb-1 text-base font-bold uppercase tracking-wide text-slate-900"
        >
          {line.slice(3)}
        </h3>,
      )
    } else if (line.startsWith('# ')) {
      flush()
      blocks.push(
        <h2 key={`h-${idx}`} className="text-lg font-bold text-slate-900">
          {line.slice(2)}
        </h2>,
      )
    } else if (/^[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*]\s+/, ''))
    } else {
      flush()
      blocks.push(
        <p key={`p-${idx}`} className="text-sm text-slate-600">
          {inline(line, `p-${idx}`)}
        </p>,
      )
    }
  })
  flush()

  return <div className="space-y-2.5">{blocks}</div>
}
