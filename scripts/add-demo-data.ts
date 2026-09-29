/**
 * Additive demo data: three more ACTIVE partner universities and a spread of
 * published courses across streams, levels and modes — so the public catalogue
 * and the admin panel have richer reference data to browse.
 *
 * Two courses also get real modules + lessons, including one lesson wired to a
 * public HLS stream + MP4 so the managed-video player and offline manifest can be
 * demonstrated without a provider account.
 *
 * Like `add-punjab.ts` (and UNLIKE the destructive `prisma/seed.ts`), this only
 * upserts — safe to run against a populated database, and safe to re-run.
 *
 *   npm run db:demo
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type CourseSeed = {
  slug: string
  title: string
  subtitle: string
  level: string
  mode: string
  stream: string
  durationYears: number
  feePerYear: number
  originalFee: number
  discountPct: number
  about: string
  eligibility: string
  highlights: string[]
  skills: string[]
  recruiters: string[]
  rating: number
  reviews: number
  featured?: boolean
}

const UNIVERSITIES: {
  slug: string
  name: string
  shortName: string
  about: string
  estYear: number
  naacGrade: string
  approvals: string[]
  rating: number
  reviews: number
  students: number
  programs: number
  city: string
  state: string
  website: string
  highlights?: string[]
  rankings?: string[]
  featured: boolean
  commissionPct: number
  courses: CourseSeed[]
}[] = [
  {
    slug: 'symbiosis-online',
    name: 'Symbiosis Online',
    shortName: 'SCDL',
    about:
      'Symbiosis Online offers UGC-entitled, NAAC A++ postgraduate and diploma programmes with a strong focus on management and IT for working professionals.',
    estYear: 2001,
    naacGrade: 'A++',
    approvals: ['UGC', 'NAAC A++', 'AICTE', 'WES Recognised'],
    rating: 4.6,
    reviews: 268,
    students: 51000,
    programs: 5,
    city: 'Pune',
    state: 'Maharashtra',
    website: 'https://www.scdl.net',
    highlights: [
      'NAAC A++ accredited (Symbiosis International University)',
      'UGC-DEB approved online & distance learning programmes',
      '51,000+ learners across management, IT and commerce',
      'Weekend live sessions with recorded lectures for revision',
      'Dedicated placement and career-support cell',
    ],
    rankings: [
      'NAAC A++ accredited (Symbiosis International University)',
      'Ranked among India’s top universities by NIRF',
      'UGC-entitled and UGC-DEB approved for online/distance degrees',
      'WES-recognised degrees for study and work abroad',
      'AICTE-approved management programmes',
    ],
    featured: true,
    commissionPct: 12,
    courses: [
      {
        slug: 'sym-online-mba-analytics',
        title: 'Online MBA in Business Analytics',
        subtitle: 'Turn data into decisions with a UGC-entitled analytics MBA.',
        level: 'PG', mode: 'ONLINE', stream: 'MANAGEMENT',
        durationYears: 2, feePerYear: 95000, originalFee: 130000, discountPct: 27,
        about:
          'Combine core management with analytics — statistics, visualisation, predictive modelling and business intelligence — delivered fully online with weekend live classes.',
        eligibility: 'Bachelor’s degree in any discipline with 50% aggregate.',
        highlights: ['UGC-entitled degree', 'Analytics specialisation', 'Live weekend classes', 'Capstone project', 'Placement assistance'],
        skills: ['Data analysis', 'Business intelligence', 'Predictive modelling', 'SQL', 'Strategy'],
        recruiters: ['Deloitte', 'EY', 'Fractal', 'Amazon', 'Axis Bank'],
        rating: 4.6, reviews: 132, featured: true,
      },
      {
        slug: 'sym-online-pgdba',
        title: 'PG Diploma in Business Administration',
        subtitle: 'A one-year professional diploma for fast career growth.',
        level: 'DIPLOMA', mode: 'ONLINE', stream: 'MANAGEMENT',
        durationYears: 1, feePerYear: 55000, originalFee: 70000, discountPct: 21,
        about:
          'A focused, one-year PG diploma covering management fundamentals, marketing, finance and operations — ideal for professionals seeking a quick credential.',
        eligibility: 'Bachelor’s degree in any discipline.',
        highlights: ['One-year programme', '100% online', 'Industry mentors', 'Flexible schedule', 'Pathway to MBA'],
        skills: ['Management', 'Marketing', 'Operations', 'Finance basics', 'Communication'],
        recruiters: ['Wipro', 'HDFC Life', 'Cognizant', 'Reliance', 'Tata'],
        rating: 4.4, reviews: 58,
      },
      {
        slug: 'sym-online-mca',
        title: 'Online MCA',
        subtitle: 'Master of Computer Applications for software careers.',
        level: 'PG', mode: 'ONLINE', stream: 'IT',
        durationYears: 2, feePerYear: 60000, originalFee: 78000, discountPct: 23,
        about:
          'Advance into full-stack development, cloud and software engineering with hands-on labs and a capstone project, delivered online.',
        eligibility: 'BCA / B.Sc (CS/IT) or Bachelor’s with Mathematics.',
        highlights: ['UGC-entitled degree', 'Full-stack & cloud', 'Coding labs', 'Capstone project', 'Placement support'],
        skills: ['Java', 'Web development', 'Cloud', 'DBMS', 'Software engineering'],
        recruiters: ['IBM', 'Oracle', 'HCLTech', 'Infosys', 'Zoho'],
        rating: 4.5, reviews: 74,
      },
    ],
  },
  {
    slug: 'nmims-distance',
    name: 'NMIMS Distance',
    shortName: 'NMIMS',
    about:
      'NMIMS Distance provides UGC-entitled distance and online degrees with a reputation for management, commerce and finance education.',
    estYear: 1981,
    naacGrade: 'A+',
    approvals: ['UGC-DEB', 'NAAC A+', 'AICTE'],
    rating: 4.5,
    reviews: 214,
    students: 38000,
    programs: 4,
    city: 'Mumbai',
    state: 'Maharashtra',
    website: 'https://www.nmims.edu',
    highlights: [
      'NAAC-accredited deemed-to-be university',
      'Ranked among India’s top management schools by NIRF',
      'UGC-DEB approved online degree programmes',
      '38,000+ learners with strong industry connect',
      'AICTE-approved MBA and PGDM offerings',
    ],
    rankings: [
      'NAAC A+ accredited deemed-to-be university',
      'Consistently ranked among India’s top management institutions (NIRF)',
      'UGC-entitled and UGC-DEB approved for online programmes',
      'AICTE-approved management education',
      'AACSB member business school',
    ],
    featured: true,
    commissionPct: 11,
    courses: [
      {
        slug: 'nmims-distance-bcom',
        title: 'B.Com (Distance)',
        subtitle: 'Commerce, accounting and taxation — study at your own pace.',
        level: 'UG', mode: 'DISTANCE', stream: 'COMMERCE',
        durationYears: 3, feePerYear: 32000, originalFee: 42000, discountPct: 24,
        about:
          'A flexible distance B.Com covering financial accounting, business law, economics and taxation — built for students balancing work and study.',
        eligibility: '10+2 with 45% aggregate from a recognised board.',
        highlights: ['UGC-entitled degree', 'Distance / self-paced', 'GST & taxation modules', 'Exam centres nationwide', 'Affordable fees'],
        skills: ['Accounting', 'Taxation', 'Business law', 'Economics', 'Auditing'],
        recruiters: ['KPMG', 'Deloitte', 'Axis Bank', 'Bajaj Finserv', 'CA firms'],
        rating: 4.3, reviews: 61,
      },
      {
        slug: 'nmims-online-bba-fintech',
        title: 'Online BBA in Fintech',
        subtitle: 'Where business meets financial technology.',
        level: 'UG', mode: 'ONLINE', stream: 'MANAGEMENT',
        durationYears: 3, feePerYear: 48000, originalFee: 64000, discountPct: 25,
        about:
          'Learn business fundamentals alongside payments, digital banking, blockchain basics and financial analytics — a modern BBA for the fintech era.',
        eligibility: '10+2 (any stream) with 50% aggregate.',
        highlights: ['UGC-entitled degree', 'Fintech specialisation', '100% online', 'Industry projects', 'Pathway to MBA'],
        skills: ['Financial analysis', 'Digital payments', 'Fintech products', 'Data basics', 'Communication'],
        recruiters: ['Razorpay', 'Paytm', 'HDFC Bank', 'PhonePe', 'ICICI'],
        rating: 4.4, reviews: 47, featured: true,
      },
    ],
  },
  {
    slug: 'jamia-online',
    name: 'Jamia Online',
    shortName: 'JMI',
    about:
      'Jamia Online delivers UGC-entitled online arts, science and IT programmes with an emphasis on accessible, affordable higher education.',
    estYear: 1920,
    naacGrade: 'A++',
    approvals: ['UGC', 'NAAC A++', 'AIU'],
    rating: 4.4,
    reviews: 176,
    students: 29000,
    programs: 4,
    city: 'New Delhi',
    state: 'Delhi',
    website: 'https://www.jmi.ac.in',
    highlights: [
      'NAAC A++ accredited central university',
      'Ranked among India’s top universities by NIRF',
      'UGC-recognised degrees with strong research output',
      '29,000+ learners across humanities, science and tech',
      'Central university with a legacy of academic excellence',
    ],
    rankings: [
      'NAAC A++ accredited central university',
      'Ranked among India’s top 10 universities by NIRF',
      'UGC-recognised central university',
      'Institution of Eminence aspirant with strong research ranking',
      'ARIIA-recognised for innovation',
    ],
    featured: false,
    commissionPct: 10,
    courses: [
      {
        slug: 'jamia-online-ba-psychology',
        title: 'Online BA in Psychology',
        subtitle: 'Understand the mind — a flexible online psychology degree.',
        level: 'UG', mode: 'ONLINE', stream: 'ARTS',
        durationYears: 3, feePerYear: 36000, originalFee: 48000, discountPct: 25,
        about:
          'Explore cognitive, social and developmental psychology with applied case studies. A UGC-entitled online BA suited to counselling, HR and research aspirants.',
        eligibility: '10+2 (any stream) with 45% aggregate.',
        highlights: ['UGC-entitled degree', '100% online', 'Applied case studies', 'Research methods', 'Counselling foundations'],
        skills: ['Psychological theory', 'Research methods', 'Counselling basics', 'Statistics', 'Empathy'],
        recruiters: ['Hospitals', 'NGOs', 'HR firms', 'EdTech', 'Research labs'],
        rating: 4.3, reviews: 39,
      },
      {
        slug: 'jamia-online-bsc-datascience',
        title: 'Online B.Sc in Data Science',
        subtitle: 'Python, statistics and machine learning from the ground up.',
        level: 'UG', mode: 'ONLINE', stream: 'SCIENCE',
        durationYears: 3, feePerYear: 52000, originalFee: 68000, discountPct: 24,
        about:
          'Build a strong foundation in Python, statistics, databases and machine learning with hands-on projects — an industry-aligned online B.Sc in Data Science.',
        eligibility: '10+2 with Mathematics, 50% aggregate.',
        highlights: ['UGC-entitled degree', 'Python & ML projects', 'Hands-on labs', 'Industry mentors', 'Internship support'],
        skills: ['Python', 'Statistics', 'Machine learning', 'SQL', 'Data visualisation'],
        recruiters: ['Fractal', 'Mu Sigma', 'Amazon', 'TCS', 'Flipkart'],
        rating: 4.5, reviews: 66, featured: true,
      },
      {
        slug: 'jamia-online-ma-history',
        title: 'Online MA in History',
        subtitle: 'From ancient civilisations to the modern world.',
        level: 'PG', mode: 'ONLINE', stream: 'ARTS',
        durationYears: 2, feePerYear: 26000, originalFee: 32000, discountPct: 19,
        about:
          'Study Indian and world history, historiography and research methods. A UGC-entitled online MA suited to teaching and civil-services aspirants.',
        eligibility: 'Bachelor’s degree in any discipline with 45% aggregate.',
        highlights: ['UGC-entitled degree', '100% online', 'Historiography', 'Research dissertation', 'UGC-NET preparation aid'],
        skills: ['Historical analysis', 'Research', 'Academic writing', 'Critical thinking', 'Sources & archives'],
        recruiters: ['Schools & colleges', 'Museums', 'Publishing', 'EdTech', 'Media'],
        rating: 4.2, reviews: 28,
      },
    ],
  },
]

/** Modules + lessons for a couple of courses, so there's real content to open. */
const CONTENT: Record<string, { title: string; description: string; lessons: LessonSeed[] }[]> = {
  'sym-online-mba-analytics': [
    {
      title: 'Foundations of Business Analytics',
      description: 'What analytics is, the data-to-decision pipeline, and the tools you’ll use.',
      lessons: [
        {
          title: 'Welcome & Course Overview',
          type: 'VIDEO', durationMin: 8,
          description: 'How the programme works and what you’ll build.',
          // Managed-video demo: public HLS stream + MP4 download + poster.
          streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          posterUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
          videoProvider: 'mux',
          transcript:
            'Welcome to Business Analytics. In this programme we move from raw data to decisions.\n\nWe start with the analytics pipeline: collect, clean, analyse, visualise, decide. Each module builds on the last, ending with a capstone on a real dataset.',
        },
        {
          title: 'The Analytics Pipeline',
          type: 'VIDEO', durationMin: 14,
          description: 'Collect → clean → analyse → visualise → decide.',
          contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
        {
          title: 'Reading: Descriptive vs Predictive Analytics',
          type: 'READING', durationMin: 10,
          body:
            'Descriptive analytics tells you what happened; predictive analytics estimates what will happen next.\n\nMost business value starts with solid descriptive reporting — clean dashboards that everyone trusts — before layering on prediction. In this reading we compare the two with retail and banking examples.',
        },
      ],
    },
    {
      title: 'Working with Data',
      description: 'Spreadsheets, SQL and the basics of a clean dataset.',
      lessons: [
        { title: 'Spreadsheets for Analysts', type: 'VIDEO', durationMin: 18, description: 'Pivot tables, lookups and clean formatting.' },
        { title: 'Your First SQL Queries', type: 'VIDEO', durationMin: 22, description: 'SELECT, WHERE, GROUP BY and JOINs.' },
      ],
    },
  ],
  'jamia-online-bsc-datascience': [
    {
      title: 'Programming with Python',
      description: 'From variables to functions — the language of data science.',
      lessons: [
        { title: 'Why Python for Data Science', type: 'VIDEO', durationMin: 9, description: 'The ecosystem: NumPy, pandas, scikit-learn.' },
        { title: 'Variables, Types & Control Flow', type: 'VIDEO', durationMin: 20, description: 'The building blocks of every program.' },
        {
          title: 'Reading: Setting Up Your Environment',
          type: 'READING', durationMin: 8,
          body:
            'Before writing code, set up a reproducible environment.\n\nWe recommend Python 3.11+, a virtual environment per project, and Jupyter for exploration. This reading walks through installation on Windows, macOS and Linux.',
        },
      ],
    },
    {
      title: 'Statistics Essentials',
      description: 'Descriptive statistics, distributions and inference.',
      lessons: [
        { title: 'Mean, Median, Mode & Spread', type: 'VIDEO', durationMin: 16, description: 'Summarising data honestly.' },
        { title: 'Distributions & the Normal Curve', type: 'VIDEO', durationMin: 19, description: 'Why the bell curve shows up everywhere.' },
      ],
    },
  ],
}

type LessonSeed = {
  title: string
  type: string
  durationMin: number
  description?: string
  body?: string
  contentUrl?: string
  transcript?: string
  streamUrl?: string
  downloadUrl?: string
  posterUrl?: string
  videoProvider?: string
}

async function main() {
  let uniCount = 0
  let courseCount = 0
  let contentCourses = 0

  for (const u of UNIVERSITIES) {
    const { courses, ...uni } = u
    const university = await prisma.university.upsert({
      where: { slug: uni.slug },
      update: { ...uni, partnerStatus: 'ACTIVE', listed: true },
      create: { ...uni, listed: true, partnerStatus: 'ACTIVE' },
    })
    uniCount++
    console.log(`University: ${university.name}`)

    for (const c of courses) {
      const { slug, ...rest } = c
      const course = await prisma.course.upsert({
        where: { slug },
        update: { reviewStatus: 'PUBLISHED', universityId: university.id, ...rest },
        create: { slug, universityId: university.id, reviewStatus: 'PUBLISHED', ...rest },
      })
      courseCount++
      console.log(`  course: ${course.title}`)

      // Attach modules + lessons only if this course has none yet (idempotent,
      // and never disturbs any learner progress on a re-run).
      const content = CONTENT[slug]
      if (content) {
        const existingModules = await prisma.module.count({ where: { courseId: course.id } })
        if (existingModules === 0) {
          for (const [mi, m] of content.entries()) {
            const mod = await prisma.module.create({
              data: { courseId: course.id, title: m.title, description: m.description, order: mi },
            })
            for (const [li, l] of m.lessons.entries()) {
              await prisma.lesson.create({
                data: {
                  moduleId: mod.id,
                  title: l.title,
                  type: l.type,
                  durationMin: l.durationMin,
                  order: li,
                  description: l.description ?? null,
                  body: l.body ?? null,
                  contentUrl: l.contentUrl ?? null,
                  transcript: l.transcript ?? null,
                  streamUrl: l.streamUrl ?? null,
                  downloadUrl: l.downloadUrl ?? null,
                  posterUrl: l.posterUrl ?? null,
                  videoProvider: l.videoProvider ?? null,
                },
              })
            }
          }
          contentCourses++
          console.log(`    + ${content.length} modules with lessons`)
        } else {
          console.log(`    (modules already present — left as is)`)
        }
      }
    }
  }

  console.log(
    `\nDone — ${uniCount} universities, ${courseCount} courses (${contentCourses} with full modules/lessons).`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
