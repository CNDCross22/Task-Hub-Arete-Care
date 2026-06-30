// Builds the IT & Marketing weekly report from the week's completed tasks.
// Output structure mirrors the team's real report:
//   ## DEPARTMENT  →  ### COMPANY  →  #### Category  →  - accomplishment bullets

import { generateText } from './gemini'
import { DEPARTMENTS } from '@/data/config'
import { memberNames } from '@/lib/members'
import { workWeekRange } from '@/lib/dates'

const dayOf = (v) => (v ? String(v).slice(0, 10) : '')

export function buildWeeklySnapshot(tasks, members = [], offsetWeeks = 0) {
  const { startKey, endKey } = workWeekRange(offsetWeeks)
  const inWeek = (v) => {
    const d = dayOf(v)
    return d && d >= startKey && d <= endKey
  }

  const completed = tasks.filter((t) => t.status === 'completed' && inWeek(t.completedAt))

  // Group: department -> company -> [task summaries]
  const byDepartment = {}
  for (const t of completed) {
    const dept = t.department || 'Other'
    const comp = t.company || 'Other'
    byDepartment[dept] ||= {}
    byDepartment[dept][comp] ||= []
    byDepartment[dept][comp].push({
      title: t.title,
      description: t.description || '',
      notes: t.notes || '',
      assignees: memberNames(t.assignees, members),
      priority: t.priority,
    })
  }

  return {
    range: { from: startKey, to: endKey },
    totalCompleted: completed.length,
    departmentsPresent: DEPARTMENTS.filter((d) => byDepartment[d]),
    byDepartment,
  }
}

export async function generateWeeklyReport(tasks, { offsetWeeks = 0, members = [], ...opts } = {}) {
  const snapshot = buildWeeklySnapshot(tasks, members, offsetWeeks)

  // No completed work this week — return a friendly note instead of asking the
  // AI to summarize an empty list (which produces an awkward apology) and
  // wasting a request.
  if (snapshot.totalCompleted === 0) {
    return {
      text: '_No tasks were completed during this reporting week. Once tasks are marked **completed**, this report will summarize them — grouped by department, company, and category._',
      range: snapshot.range,
      snapshot,
    }
  }

  const prompt = `You are an operations associate compiling the team's WEEKLY REPORT covering IT and Marketing work across several companies.

Here is every task COMPLETED during the reporting week, already grouped by department and company (JSON):
${JSON.stringify(snapshot.byDepartment, null, 2)}

Write ONLY the markdown body of the report, using EXACTLY this hierarchy and nothing else:

- Each department as a level-2 heading: the department name in UPPERCASE followed by the word DEPARTMENT. Write it exactly as "## IT DEPARTMENT" or "## MARKETING DEPARTMENT". Include a department only if it has completed work.
- Within a department, each company as a level-3 heading in UPPERCASE, e.g. "### ARETE CARE".
- Within a company, cluster its tasks into 1–4 thematic CATEGORIES. Write each category as a level-4 heading in Title Case, e.g. "#### Content Creation & Social Media", "#### Account & Technical Support".
- Under each category, list the accomplishments as "- " bullet points. Begin every bullet with a past-tense action verb in ACTIVE voice (e.g. Added, Created, Provided, Conducted, Updated, Resolved, Finalized, Scheduled, Drafted, Posted). Never use passive voice such as "... was resolved". Example: "Added multi-factor authentication for the HR team to strengthen account security."

Strict rules:
- Use ONLY the tasks provided. Never invent work, people, companies, or categories with no basis in the data.
- Name specific people, teams, or tools when they appear in the task title/description/notes.
- Merge obvious duplicates; keep bullets crisp and outcome-focused.
- Do NOT output a title, a date line, an overview, totals, or any "in progress" / "looking ahead" section — completed work only.
- Output nothing but the markdown body described above.`

  const text = await generateText(prompt, opts)
  return { text, range: snapshot.range, snapshot }
}
