import { Compass, Route, PenLine, MessagesSquare } from 'lucide-react'
import type { AiFeature } from '@/lib/ai/types'

/**
 * Static definitions for the four AI Career Kit tools — shared by the hub page,
 * the individual tool pages and the generic <CareerKitTool> panel so a tool is
 * described in exactly one place. Plain data (no 'use client', no server-only
 * imports) so it runs on either side of the boundary.
 *
 * `feature` doubles as the AI routing key and the API endpoint (`/api/<feature>`).
 */

export type ToolField = {
  name: string
  label: string
  type: 'input' | 'textarea' | 'select'
  required?: boolean
  hint?: string
  placeholder?: string
  maxLength?: number
  options?: { value: string; label: string }[]
  default?: string
}

export type ToolConfig = {
  feature: Extract<AiFeature, 'career' | 'roadmap' | 'sop' | 'interview'>
  href: string
  icon: React.ElementType
  accent: string
  title: string
  blurb: string
  formTitle: string
  formSub: string
  submitLabel: string
  loadingLabel: string
  emptyTitle: string
  emptyBody: string
  fields: ToolField[]
}

export const TOOL_CONFIGS: Record<
  'career' | 'roadmap' | 'sop' | 'interview',
  ToolConfig
> = {
  career: {
    feature: 'career',
    href: '/dashboard/career/paths',
    icon: Compass,
    accent: 'from-emerald-400 to-teal-500',
    title: 'Career Path Finder',
    blurb: 'Turn your interests and your study record into a few realistic career directions with concrete first steps.',
    formTitle: 'What are you into?',
    formSub: 'A few honest lines are enough — the AI does the rest.',
    submitLabel: 'Find my paths',
    loadingLabel: 'Mapping your options…',
    emptyTitle: 'Your career directions will appear here',
    emptyBody: 'Tell us what you enjoy and where you feel strong. We match it against what you study to suggest paths worth exploring.',
    fields: [
      { name: 'interests', label: 'Interests & what you enjoy', type: 'textarea', required: true, maxLength: 1500, placeholder: 'I like design, working with people, and figuring out how apps are built…' },
      { name: 'strengths', label: 'Strengths / subjects you’re good at', type: 'textarea', hint: 'Optional', maxLength: 1000, placeholder: 'Good at maths and communication, decent at English writing…' },
      { name: 'constraints', label: 'Any constraints', type: 'input', hint: 'Optional — location, time, budget', maxLength: 1000, placeholder: 'Need to stay in Pune, prefer online study' },
    ],
  },
  roadmap: {
    feature: 'roadmap',
    href: '/dashboard/career/roadmap',
    icon: Route,
    accent: 'from-sky-400 to-blue-500',
    title: 'Skill Roadmap',
    blurb: 'Name a goal and get an ordered, phased plan — what to focus on and the milestones that prove each phase is done.',
    formTitle: 'What’s the goal?',
    formSub: 'One clear goal makes for a sharper roadmap.',
    submitLabel: 'Build my roadmap',
    loadingLabel: 'Planning your phases…',
    emptyTitle: 'Your roadmap will appear here',
    emptyBody: 'Give us a goal — a role, a skill, an exam — and we’ll break the journey into doable phases with real milestones.',
    fields: [
      { name: 'goal', label: 'Your goal', type: 'input', required: true, maxLength: 200, placeholder: 'Become a front-end developer' },
      { name: 'timeframe', label: 'Timeframe you have', type: 'input', hint: 'Optional', maxLength: 120, placeholder: '6 months, evenings only' },
      { name: 'startingPoint', label: 'Where you’re starting from', type: 'textarea', hint: 'Optional', maxLength: 1000, placeholder: 'Know basic HTML and a little Python, no projects yet…' },
    ],
  },
  sop: {
    feature: 'sop',
    href: '/dashboard/career/sop',
    icon: PenLine,
    accent: 'from-amber-400 to-orange-500',
    title: 'SOP Writer',
    blurb: 'Draft a Statement of Purpose in your own voice from your real background — a structured start you personalise.',
    formTitle: 'About your application',
    formSub: 'The draft uses only what you give it — add specifics only you know afterwards.',
    submitLabel: 'Draft my SOP',
    loadingLabel: 'Drafting your statement…',
    emptyTitle: 'Your SOP draft will appear here',
    emptyBody: 'Tell us the programme and a little about your background and motivation. We’ll shape it into editable paragraphs.',
    fields: [
      { name: 'programme', label: 'Programme you’re applying to', type: 'input', required: true, maxLength: 160, placeholder: 'M.Sc. Data Science' },
      { name: 'institution', label: 'Institution', type: 'input', hint: 'Optional', maxLength: 160, placeholder: 'University of Hyderabad' },
      { name: 'background', label: 'Your background', type: 'textarea', required: true, maxLength: 3000, placeholder: 'B.Sc. Statistics graduate, interned analysing survey data…' },
      { name: 'motivation', label: 'Why you want this', type: 'textarea', required: true, maxLength: 2000, placeholder: 'I want to work on applied ML for healthcare because…' },
      { name: 'goals', label: 'Career goals afterwards', type: 'textarea', hint: 'Optional', maxLength: 1500, placeholder: 'Become a data scientist in a health-tech company' },
    ],
  },
  interview: {
    feature: 'interview',
    href: '/dashboard/career/interview',
    icon: MessagesSquare,
    accent: 'from-fuchsia-400 to-violet-500',
    title: 'Interview Prep',
    blurb: 'Get the questions you’re likely to face and honest angles to build your own answers — no fabricated scripts.',
    formTitle: 'What are you preparing for?',
    formSub: 'Name the target and we’ll surface the likely questions.',
    submitLabel: 'Prep me',
    loadingLabel: 'Lining up questions…',
    emptyTitle: 'Your interview prep will appear here',
    emptyBody: 'Tell us the role or programme you’re interviewing for. We’ll list likely questions and how to approach each.',
    fields: [
      { name: 'target', label: 'Role or programme', type: 'input', required: true, maxLength: 160, placeholder: 'Business Analyst at a startup' },
      {
        name: 'kind', label: 'Type of interview', type: 'select', default: 'job',
        options: [
          { value: 'job', label: 'Job interview' },
          { value: 'admission', label: 'Admissions interview' },
        ],
      },
      { name: 'background', label: 'Anything relevant to mention', type: 'textarea', hint: 'Optional', maxLength: 2000, placeholder: 'Final-year B.Com, did a finance internship last summer…' },
    ],
  },
}

export const TOOL_ORDER: (keyof typeof TOOL_CONFIGS)[] = ['career', 'roadmap', 'sop', 'interview']
