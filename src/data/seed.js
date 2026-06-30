// Initial sample data — used the first time the app runs (before localStorage exists).
// Replaced by whatever the user creates; persisted to localStorage thereafter.

import { workWeekRange } from '@/lib/dates'

const today = new Date()
const iso = (offsetDays) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// Anchor "completed" demo tasks inside the current Mon–Fri work week so the
// Weekly Report (which filters by work week) has data to show out of the box.
const doneOn = workWeekRange(0).startKey

export const seedData = {
  projects: [
    { id: 'p_web', name: 'Website Revamp', color: 'blue', description: 'Marketing site redesign and CMS migration.' },
    { id: 'p_infra', name: 'IT Infrastructure', color: 'emerald', description: 'Network, devices, and security hardening.' },
    { id: 'p_campaign', name: 'Q3 Campaign', color: 'amber', description: 'Multi-channel marketing campaign launch.' },
    { id: 'p_support', name: 'Helpdesk', color: 'rose', description: 'Internal support and ticket resolution.' },
  ],
  tasks: [
    { id: 't_1001', title: 'Migrate DNS to new registrar', description: 'Move zones and verify propagation.', status: 'in_progress', priority: 'high', assignees: ['u_marcus'], company: 'Arete Care', department: 'IT', projectId: 'p_infra', startDate: iso(-1), dueDate: iso(2), startTime: '09:00', endTime: '11:00', notes: '', recurring: false, recurrence: 'weekly', completedAt: null, tags: ['network', 'dns'], createdAt: iso(-5) },
    { id: 't_1002', title: 'Design new homepage hero', description: 'Finalized three hero concepts and published the approved design.', status: 'completed', priority: 'medium', assignees: ['u_priya'], company: 'Arete Care', department: 'Marketing', projectId: 'p_web', startDate: iso(-2), dueDate: iso(1), startTime: '', endTime: '', notes: '', recurring: false, recurrence: 'weekly', completedAt: doneOn, tags: ['design'], createdAt: iso(-6) },
    { id: 't_1003', title: 'Set up email marketing automation', description: 'Built welcome and nurture email sequences.', status: 'completed', priority: 'medium', assignees: ['u_dana'], company: 'TFO PH', department: 'Marketing', projectId: 'p_campaign', startDate: iso(-3), dueDate: iso(-1), startTime: '', endTime: '', notes: '', recurring: false, recurrence: 'weekly', completedAt: doneOn, tags: ['email', 'automation'], createdAt: iso(-4) },
    { id: 't_1004', title: 'Patch endpoint security agents', description: 'Roll out latest agent across all devices.', status: 'pending', priority: 'urgent', assignees: ['u_marcus', 'u_sam'], company: 'Arete Care', department: 'IT', projectId: 'p_infra', startDate: iso(-1), dueDate: iso(-1), startTime: '08:00', endTime: '17:00', notes: 'Coordinate downtime window.', recurring: true, recurrence: 'monthly', completedAt: null, tags: ['security'], createdAt: iso(-3) },
    { id: 't_1005', title: 'Write blog post: client onboarding', description: 'Wrote and scheduled a 1,200-word SEO-optimized blog post.', status: 'completed', priority: 'low', assignees: ['u_dana'], company: 'Mamta Face Yoga', department: 'Marketing', projectId: 'p_campaign', startDate: iso(-3), dueDate: iso(-1), startTime: '', endTime: '', notes: '', recurring: false, recurrence: 'weekly', completedAt: doneOn, tags: ['content', 'seo'], createdAt: iso(-4) },
    { id: 't_1006', title: 'Resolve printer connectivity tickets', description: 'Closed a batch of six open helpdesk tickets.', status: 'completed', priority: 'low', assignees: ['u_sam'], company: 'Arete Care', department: 'IT', projectId: 'p_support', startDate: iso(-3), dueDate: iso(-2), startTime: '', endTime: '', notes: '', recurring: false, recurrence: 'weekly', completedAt: doneOn, tags: ['support'], createdAt: iso(-8) },
    { id: 't_1007', title: 'Configure CMS staging environment', description: 'Headless CMS + preview builds.', status: 'in_progress', priority: 'high', assignees: ['u_alex'], company: 'Arete Care', department: 'IT', projectId: 'p_web', startDate: iso(-2), dueDate: iso(3), startTime: '13:00', endTime: '16:00', notes: '', recurring: false, recurrence: 'weekly', completedAt: null, tags: ['cms', 'devops'], createdAt: iso(-4) },
    { id: 't_1008', title: 'Audit Google Ads spend', description: 'Pause underperforming campaigns.', status: 'review', priority: 'medium', assignees: ['u_dana', 'u_priya'], company: 'TFO India', department: 'Marketing', projectId: 'p_campaign', startDate: iso(-1), dueDate: iso(0), startTime: '', endTime: '', notes: '', recurring: false, recurrence: 'weekly', completedAt: null, tags: ['ads', 'analytics'], createdAt: iso(-2) },
    { id: 't_1009', title: 'Onboard new hire laptop', description: 'Imaged device, set up accounts, MFA, and VPN for new hire.', status: 'completed', priority: 'medium', assignees: ['u_sam'], company: 'Arete Care', department: 'IT', projectId: 'p_infra', startDate: iso(-4), dueDate: iso(-3), startTime: '10:00', endTime: '12:00', notes: '', recurring: false, recurrence: 'weekly', completedAt: doneOn, tags: ['onboarding'], createdAt: iso(-9) },
    { id: 't_1010', title: 'Draft social media calendar', description: 'July schedule across channels.', status: 'pending', priority: 'high', assignees: ['u_priya'], company: 'Raaehi', department: 'Marketing', projectId: 'p_campaign', startDate: iso(0), dueDate: iso(4), startTime: '', endTime: '', notes: '', recurring: true, recurrence: 'weekly', completedAt: null, tags: ['social'], createdAt: iso(0) },
  ],
}
