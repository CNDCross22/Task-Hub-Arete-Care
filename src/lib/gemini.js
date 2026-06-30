// Lightweight Gemini client (REST, no SDK dependency).
//
// LOCAL NOTE: the key is read from VITE_GEMINI_API_KEY and ends up in the browser
// bundle. That's fine for local dev. When we move to Supabase, this same call
// should run inside a Supabase Edge Function so the key stays server-side — only
// the call sites (Reports / Weekly Report) change to invoke the function URL.

import { STATUSES, PRIORITIES, COMPANIES, DEPARTMENTS } from '@/data/config'
import { hasEdgeConfig, aiViaEdge } from '@/data/backend/edgeBackend'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

// In edge mode the key lives in the Edge Function, so the client doesn't need it.
export const isAIConfigured = () => hasEdgeConfig || Boolean(API_KEY)

export async function generateText(prompt, { model = MODEL, signal } = {}) {
  // Edge mode: proxy through the Edge Function (Gemini key stays server-side).
  if (hasEdgeConfig) return aiViaEdge(prompt, model)

  if (!API_KEY)
    throw new Error('Missing VITE_GEMINI_API_KEY — add it to .env.local and restart the dev server.')

  const generationConfig = { temperature: 0.4, maxOutputTokens: 2048 }
  // 2.5 models "think" by default, which can consume the whole token budget
  // before producing visible text. This summarization task doesn't need it.
  if (model.includes('2.5')) generationConfig.thinkingConfig = { thinkingBudget: 0 }

  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
    signal,
  })

  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j?.error?.message || ''
    } catch {
      /* ignore */
    }
    throw new Error(`Gemini API error ${res.status}${detail ? `: ${detail}` : ''}`)
  }

  const data = await res.json()
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || ''
  if (!text) throw new Error('Gemini returned no text (response may have been blocked).')
  return text
}

const todayStr = () => new Date().toISOString().slice(0, 10)

// Compact, token-light snapshot of the task data for the model.
export function buildSnapshot(tasks, members = []) {
  const today = todayStr()
  const count = (fn) => tasks.filter(fn).length
  const nameOf = new Map((members || []).map((m) => [m.id, m.name]))

  const overdue = tasks.filter((t) => t.status !== 'completed' && t.dueDate && t.dueDate < today)

  const tally = (keys, pick) =>
    keys.reduce((acc, k) => {
      acc[typeof k === 'string' ? k : k.label] = count((t) => pick(t) === (k.key ?? k))
      return acc
    }, {})

  const workload = {}
  for (const t of tasks) {
    for (const id of t.assignees || []) {
      const name = nameOf.get(id) || id
      workload[name] = workload[name] || { total: 0, open: 0 }
      workload[name].total += 1
      if (t.status !== 'completed') workload[name].open += 1
    }
  }

  return {
    totalTasks: tasks.length,
    completed: count((t) => t.status === 'completed'),
    overdueCount: overdue.length,
    byStatus: tally(STATUSES, (t) => t.status),
    byPriority: tally(PRIORITIES, (t) => t.priority),
    byCompany: tally(COMPANIES, (t) => t.company),
    byDepartment: tally(DEPARTMENTS, (t) => t.department),
    workloadByAssignee: workload,
    overdueTasks: overdue.slice(0, 12).map((t) => ({
      title: t.title,
      company: t.company,
      department: t.department,
      priority: t.priority,
      due: t.dueDate,
    })),
    urgentOpen: tasks
      .filter((t) => t.priority === 'urgent' && t.status !== 'completed')
      .map((t) => ({ title: t.title, company: t.company, due: t.dueDate })),
  }
}

export async function generateInsights(tasks, members = [], opts = {}) {
  // Nothing to analyze — skip the AI round-trip and return a clear note.
  if (tasks.length === 0) {
    return '## Summary\nThere are no tasks yet, so there’s nothing to analyze. Add tasks to get insights on risks, bottlenecks, and workload.'
  }

  const snapshot = buildSnapshot(tasks, members)
  const prompt = `You are an operations analyst for a cross-company task hub spanning the companies ${COMPANIES.join(
    ', ',
  )} and the departments ${DEPARTMENTS.join(', ')}.

Analyze this current snapshot of task data (JSON):
${JSON.stringify(snapshot, null, 2)}

Write a concise operations report in markdown with exactly these sections:
## Summary
2-3 sentences on overall health and throughput.
## Risks & Bottlenecks
Bullet points covering overdue work, urgent items, overloaded people, and any company or department falling behind. Reference specific numbers and names from the data.
## Recommendations
3-5 short, actionable bullets prioritized by impact.

Keep the whole response under 220 words. Do not invent data that isn't in the JSON.`

  return generateText(prompt, opts)
}
