import { PrismaClient } from '@prisma/client'
import { UNIVERSITIES, COURSES, type CourseSeed } from './seed-catalog'
import { BOOKS, STATIONERY } from './shop-catalog'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'

const prisma = new PrismaClient()

// storage/, not public/ — material is served only via the authenticated
// /api/materials/[id]/download route, which checks enrolment.
const UPLOAD_DIR = path.join(process.cwd(), 'storage', 'uploads', 'seed')

// ---------------------------------------------------------------------------
// Minimal single-page PDF writer.
// Seeded study material has to be really downloadable, so we emit valid PDFs
// (correct xref offsets) rather than pointing at files that 404.
// ---------------------------------------------------------------------------
function makePdf(title: string, lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/([\\()])/g, '\\$1')
  const content = [
    'BT',
    '/F1 20 Tf',
    '60 780 Td',
    `(${esc(title)}) Tj`,
    '/F1 11 Tf',
    '0 -36 Td',
    ...lines.flatMap((l) => [`(${esc(l)}) Tj`, '0 -18 Td']),
    'ET',
  ].join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R ' +
      '/Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  return Buffer.from(pdf, 'latin1')
}

function writeMaterialFile(slug: string, title: string, lines: string[]) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const fileName = `${slug}.pdf`
  const buf = makePdf(title, lines)
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buf)
  return { fileName, fileUrl: `/uploads/seed/${fileName}`, fileSize: buf.length }
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const universities = UNIVERSITIES

const courses = COURSES

// --------------------------------------------------------------- curriculum

/** Hand-authored curriculum for the flagship courses. */
const CURRICULUM: Record<string, { title: string; lessons: string[] }[]> = {
  'online-bba-digital-marketing': [
    {
      title: 'Introduction to Marketing',
      lessons: [
        'What is Marketing? Core Concepts',
        'The Marketing Mix: 4Ps and 7Ps',
        'Understanding Consumer Behaviour',
        'Market Segmentation & Targeting',
        'Live Session: Positioning Workshop',
      ],
    },
    {
      title: 'Digital Marketing Overview',
      lessons: [
        'The Digital Marketing Landscape',
        'Building a Digital Marketing Funnel',
        'Owned, Earned and Paid Media',
        'Setting Campaign KPIs',
      ],
    },
    {
      title: 'SEO & SEM',
      lessons: [
        'How Search Engines Rank Pages',
        'Keyword Research in Practice',
        'On-Page and Technical SEO',
        'Link Building & Off-Page SEO',
        'Google Ads: Campaign Structure',
        'Live Session: Auditing a Real Website',
      ],
    },
    {
      title: 'Social Media Marketing',
      lessons: [
        'Choosing the Right Platforms',
        'Content Calendars That Work',
        'Meta Ads Manager Deep Dive',
        'Influencer & Community Marketing',
        'Live Session: Building a 30-Day Content Plan',
      ],
    },
    {
      title: 'Email Marketing & Analytics',
      lessons: [
        'List Building and Segmentation',
        'Writing Emails People Open',
        'Automation & Drip Campaigns',
        'Google Analytics 4 Fundamentals',
        'Attribution and Reporting',
      ],
    },
  ],
  'online-bca': [
    {
      title: 'Programming Fundamentals',
      lessons: [
        'Introduction to Programming & Algorithms',
        'Variables, Types and Operators',
        'Control Flow: Conditionals and Loops',
        'Functions and Scope',
        'Live Lab: Your First Program',
      ],
    },
    {
      title: 'Data Structures',
      lessons: [
        'Arrays and Strings',
        'Linked Lists',
        'Stacks and Queues',
        'Trees and Graphs',
        'Sorting and Searching',
      ],
    },
    {
      title: 'Web Development',
      lessons: [
        'HTML5 Semantics',
        'CSS Layout: Flexbox and Grid',
        'JavaScript Essentials',
        'Working with APIs',
        'Live Lab: Deploying Your First Site',
      ],
    },
    {
      title: 'Databases & DBMS',
      lessons: [
        'Relational Model and Normalisation',
        'SQL: Queries and Joins',
        'Indexes and Query Performance',
        'Transactions and ACID',
      ],
    },
  ],
  'online-mba-business-analytics': [
    {
      title: 'Foundations of Business Analytics',
      lessons: [
        'The Analytics Value Chain',
        'Descriptive vs Predictive vs Prescriptive',
        'Framing a Business Problem as a Data Problem',
        'Live Session: Analytics Case Clinic',
      ],
    },
    {
      title: 'Statistics for Managers',
      lessons: [
        'Descriptive Statistics and Distributions',
        'Hypothesis Testing',
        'Regression Analysis',
        'Experiment Design and A/B Testing',
      ],
    },
    {
      title: 'Python & SQL for Analytics',
      lessons: [
        'Python Essentials for Analysts',
        'pandas: Reshaping and Aggregation',
        'SQL for Analytical Queries',
        'Live Lab: End-to-End Data Pipeline',
      ],
    },
    {
      title: 'Visualisation & Storytelling',
      lessons: [
        'Choosing the Right Chart',
        'Power BI Dashboards',
        'Narrative Structure for Executives',
        'Capstone Briefing',
      ],
    },
  ],
}

/** Generic but stream-appropriate curriculum for the remaining courses. */
function fallbackCurriculum(c: CourseSeed) {
  const [s1, s2, s3, s4] = c.skills
  return [
    {
      title: `Foundations of ${c.stream === 'IT' ? 'Computing' : c.title.split(' in ')[1] ?? 'the Discipline'}`,
      lessons: [
        'Course Orientation & Learning Path',
        `Core Concepts: ${s1 ?? 'Fundamentals'}`,
        `Applied Basics: ${s2 ?? 'Practice'}`,
        'Live Session: Q&A with Faculty',
      ],
    },
    {
      title: `Core Module: ${s2 ?? 'Principles'}`,
      lessons: [
        `Understanding ${s2 ?? 'Principles'}`,
        'Case Study Analysis',
        `Practical Applications of ${s3 ?? 'Theory'}`,
        'Assignment Walkthrough',
      ],
    },
    {
      title: `Advanced Module: ${s3 ?? 'Applications'}`,
      lessons: [
        `Advanced ${s3 ?? 'Topics'}`,
        `Industry Practices in ${s4 ?? 'the Field'}`,
        'Capstone Project Briefing',
        'Revision & Exam Strategy',
      ],
    },
  ]
}

function lessonType(title: string): string {
  if (/live (session|lab)/i.test(title)) return 'LIVE'
  if (/fundamentals|concepts|introduction|understanding|revision|strategy/i.test(title)) return 'READING'
  return 'VIDEO'
}

function questionsFor(moduleTitle: string) {
  return [
    {
      text: `Which of the following best describes the primary focus of "${moduleTitle}"?`,
      options: [
        'Memorising terminology without application',
        'Applying core concepts to real-world business or technical problems',
        'Avoiding practical work entirely',
        'Studying only historical background',
      ],
      correctIndex: 1,
    },
    {
      text: 'When preparing for the end-of-module assessment, the most effective approach is to:',
      options: [
        'Skip the assignments and read only the summary',
        'Watch lectures at 3x speed the night before',
        'Complete the assignments, review the notes, then attempt the practice paper',
        'Rely entirely on the discussion forum',
      ],
      correctIndex: 2,
    },
    {
      text: 'Study material uploaded by faculty for this module is best used to:',
      options: [
        'Reinforce lecture content and practise past questions',
        'Replace attending live sessions',
        'Share publicly outside the platform',
        'Ignore until the final exam',
      ],
      correctIndex: 0,
    },
    {
      text: 'A learner falling behind on this module should first:',
      options: [
        'Drop the course',
        'Use recorded lectures and reach out to the mentor via the dashboard',
        'Wait until the next semester',
        'Attempt the final exam anyway',
      ],
      correctIndex: 1,
    },
  ]
}

// ---------------------------------------------------------------------------

async function main() {
  console.log('Resetting data...')
  // Order matters: children before parents.
  await prisma.partnerApplication.deleteMany()
  await prisma.chatMessage.deleteMany()
  await prisma.learningPathCourse.deleteMany()
  await prisma.learningPath.deleteMany()
  await prisma.review.deleteMany()
  await prisma.certificate.deleteMany()
  await prisma.application.deleteMany()
  await prisma.lessonProgress.deleteMany()
  await prisma.testAttempt.deleteMany()
  await prisma.question.deleteMany()
  await prisma.test.deleteMany()
  await prisma.material.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.module.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.course.deleteMany()
  await prisma.university.deleteMany()
  await prisma.user.deleteMany()

  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true })

  // ------------------------------------------------------------------ users
  console.log('Creating users...')
  const pwAdmin = await bcrypt.hash('Admin@123', 10)
  const pwStudent = await bcrypt.hash('Student@123', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@academiaglobal.in',
      passwordHash: pwAdmin,
      name: 'Shiksha Sarthi Admin',
      role: 'ADMIN',
      phone: '+91 98765 43210',
      city: 'Karnal',
      state: 'Haryana',
    },
  })

  const rahul = await prisma.user.create({
    data: {
      email: 'rahul@student.in',
      passwordHash: pwStudent,
      name: 'Rahul Sharma',
      role: 'STUDENT',
      phone: '+91 90123 45678',
      dob: '2003-06-14',
      gender: 'Male',
      city: 'Jaipur',
      state: 'Rajasthan',
    },
  })

  const priya = await prisma.user.create({
    data: {
      email: 'priya@student.in',
      passwordHash: pwStudent,
      name: 'Priya Nair',
      role: 'STUDENT',
      phone: '+91 91234 56789',
      dob: '2001-11-02',
      gender: 'Female',
      city: 'Kochi',
      state: 'Kerala',
    },
  })

  // ----------------------------------------------------------- universities
  console.log('Creating universities...')
  const uniByslug: Record<string, string> = {}
  for (const u of universities) {
    const created = await prisma.university.create({
      // Seeded institutions are live, onboarded partners, so their courses are
      // visible under the review gate. Public sign-ups start as PROSPECT and go
      // live only once an operator activates them.
      data: { ...u, approvals: u.approvals, partnerStatus: 'ACTIVE', commissionPct: 12 },
    })
    uniByslug[u.slug] = created.id
  }

  // A demo partner login and a pending public application, so the partner portal
  // and the operator's review queues have something to show out of the box.
  await prisma.user.create({
    data: {
      email: 'partner@amity.edu',
      passwordHash: await bcrypt.hash('Partner@123', 10),
      name: 'Priya Sharma',
      role: 'PARTNER',
      phone: '+91 98111 22334',
      universityId: uniByslug['amity-university-online'],
    },
  })
  await prisma.partnerApplication.create({
    data: {
      universityName: 'Sunrise Institute of Technology',
      contactName: 'Rakesh Menon',
      contactEmail: 'rakesh@sunrise.edu.in',
      contactPhone: '+91 98200 11223',
      website: 'https://sunrise.edu.in',
      city: 'Pune',
      state: 'Maharashtra',
      message:
        'We run online BBA, BCA and MBA programmes and would like to list them on Shiksha Sarthi.',
    },
  })

  // ---------------------------------------------------------------- courses
  console.log('Creating courses, modules, lessons, tests and material...')
  const courseIdBySlug: Record<string, string> = {}

  for (const c of courses) {
    const discountPct = c.originalFee
      ? Math.round(((c.originalFee - c.feePerYear) / c.originalFee) * 100)
      : 0

    const course = await prisma.course.create({
      data: {
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        level: c.level,
        mode: c.mode,
        stream: c.stream,
        durationYears: c.durationYears,
        feePerYear: c.feePerYear,
        originalFee: c.originalFee ?? null,
        discountPct,
        about: c.about,
        eligibility: c.eligibility,
        highlights: c.highlights,
        skills: c.skills,
        recruiters: c.recruiters,
        rating: c.rating,
        reviews: c.reviews,
        featured: c.featured ?? false,
        hasLiveClass: c.hasLiveClass ?? true,
        hasPlacement: c.hasPlacement ?? true,
        isUgcEntitled: true,
        universityId: uniByslug[c.university],
      },
    })
    courseIdBySlug[c.slug] = course.id

    const curriculum = CURRICULUM[c.slug] ?? fallbackCurriculum(c)

    // Course-level syllabus document.
    const syllabusFile = writeMaterialFile(
      `${c.slug}-syllabus`,
      `${c.title} - Syllabus`,
      [
        `University: ${universities.find((u) => u.slug === c.university)?.name ?? ''}`,
        `Duration: ${c.durationYears} year(s)   Mode: ${c.mode}`,
        `Eligibility: ${c.eligibility}`,
        '',
        'Modules covered in this programme:',
        ...curriculum.map((m, i) => `  ${i + 1}. ${m.title}`),
        '',
        'Assessment: continuous assignments, module quizzes and a final examination.',
        'Issued by Shiksha Sarthi Virtual Learning.',
      ],
    )
    await prisma.material.create({
      data: {
        title: `${c.title} — Full Syllabus`,
        type: 'SYLLABUS',
        ...syllabusFile,
        mimeType: 'application/pdf',
        courseId: course.id,
        uploadedById: admin.id,
      },
    })

    for (const [mi, m] of curriculum.entries()) {
      const mod = await prisma.module.create({
        data: {
          title: m.title,
          description: `Module ${mi + 1} of ${curriculum.length} — ${c.title}`,
          order: mi,
          courseId: course.id,
        },
      })

      for (const [li, lessonTitle] of m.lessons.entries()) {
        const type = lessonType(lessonTitle)
        await prisma.lesson.create({
          data: {
            title: lessonTitle,
            description: `${lessonTitle} — part of ${m.title}.`,
            order: li,
            type,
            durationMin: type === 'LIVE' ? 60 : type === 'READING' ? 12 : 18,
            body:
              type === 'READING'
                ? `This reading covers ${lessonTitle.toLowerCase()}. Work through the notes, then attempt the practice questions at the end of the module. Supporting PDFs for this module are available under the Study Material tab.`
                : null,
            moduleId: mod.id,
          },
        })
      }

      // Module notes + a past test paper, both real downloadable PDFs.
      const notes = writeMaterialFile(
        `${c.slug}-m${mi + 1}-notes`,
        `${m.title} — Study Notes`,
        [
          `Course: ${c.title}`,
          `Module ${mi + 1}: ${m.title}`,
          '',
          'Topics in this module:',
          ...m.lessons.map((l, i) => `  ${i + 1}. ${l}`),
          '',
          'Key takeaways:',
          '  - Review each lesson before attempting the module quiz.',
          '  - Complete the assignment to unlock full progress credit.',
          '  - Live session recordings remain available for the whole term.',
        ],
      )
      await prisma.material.create({
        data: {
          title: `${m.title} — Study Notes`,
          type: 'NOTES',
          ...notes,
          courseId: course.id,
          moduleId: mod.id,
          uploadedById: admin.id,
        },
      })

      const paper = writeMaterialFile(
        `${c.slug}-m${mi + 1}-paper`,
        `${m.title} — Practice Test Paper`,
        [
          `Course: ${c.title}`,
          `Module ${mi + 1}: ${m.title}`,
          'Maximum marks: 20        Time: 45 minutes',
          '',
          'Section A - Short answer (2 marks each)',
          `  1. Define the core concepts introduced in ${m.title}.`,
          '  2. List three practical applications discussed in the lectures.',
          '  3. Explain one common mistake practitioners make in this area.',
          '',
          'Section B - Long answer (7 marks each)',
          `  4. Discuss how ${m.title.toLowerCase()} contributes to overall outcomes.`,
          '  5. Present a short case analysis using the framework from this module.',
        ],
      )
      await prisma.material.create({
        data: {
          title: `${m.title} — Practice Test Paper`,
          type: 'TEST_PAPER',
          ...paper,
          courseId: course.id,
          moduleId: mod.id,
          uploadedById: admin.id,
        },
      })

      // Module quiz.
      const qs = questionsFor(m.title)
      const test = await prisma.test.create({
        data: {
          title: `${m.title} — Module Quiz`,
          type: mi === curriculum.length - 1 ? 'FINAL' : 'QUIZ',
          totalMarks: qs.length * 5,
          passMarks: Math.ceil(qs.length * 5 * 0.4),
          durationMin: 20,
          moduleId: mod.id,
        },
      })
      for (const [qi, q] of qs.entries()) {
        await prisma.question.create({
          data: {
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            marks: 5,
            order: qi,
            testId: test.id,
          },
        })
      }
    }
  }

  // ------------------------------------------------------------ enrolments
  console.log('Creating enrolments and progress...')

  async function enroll(userId: string, slug: string, targetPct: number) {
    const courseId = courseIdBySlug[slug]
    const enrollment = await prisma.enrollment.create({
      data: { userId, courseId, progressPct: 0 },
    })

    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId } },
      orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
      select: { id: true },
    })

    const takeCount = Math.round((targetPct / 100) * lessons.length)
    for (const l of lessons.slice(0, takeCount)) {
      await prisma.lessonProgress.create({ data: { userId, lessonId: l.id } })
    }

    const actualPct = lessons.length ? Math.round((takeCount / lessons.length) * 100) : 0
    const completed = actualPct >= 100
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPct: actualPct,
        status: completed ? 'COMPLETED' : 'ACTIVE',
        completedAt: completed ? new Date() : null,
      },
    })
    return { enrollment, actualPct, completed }
  }

  await enroll(rahul.id, 'online-bba-digital-marketing', 68)
  await enroll(rahul.id, 'certificate-data-science', 25)
  const finished = await enroll(rahul.id, 'diploma-digital-marketing', 100)
  await enroll(priya.id, 'online-bca', 45)
  await enroll(priya.id, 'online-mba-business-analytics', 12)

  // Certificate for the completed programme.
  await prisma.certificate.create({
    data: {
      serial: 'AG-2026-DDM-004821',
      grade: 'A',
      userId: rahul.id,
      courseId: courseIdBySlug['diploma-digital-marketing'],
      enrollmentId: finished.enrollment.id,
    },
  })

  // ---------------------------------------------------------------- reviews
  console.log('Creating reviews...')
  await prisma.review.create({
    data: {
      rating: 5,
      body:
        'I had to drop my studies after 12th due to financial problems. Shiksha Sarthi helped me complete my BBA through distance learning. Today I am working in a top MNC.',
      userId: rahul.id,
      courseId: courseIdBySlug['online-bba-digital-marketing'],
    },
  })
  await prisma.review.create({
    data: {
      rating: 5,
      body:
        'The live labs made all the difference — I deployed my first real project in the third month and it is still in my portfolio.',
      userId: priya.id,
      courseId: courseIdBySlug['online-bca'],
    },
  })

  // ---------------------------------------------------------- learning paths
  // Curated, ordered tracks of existing courses toward one career outcome —
  // a discovery layer; each course is still enrolled on its own page.
  console.log('Creating learning paths...')
  const learningPaths = [
    {
      slug: 'digital-marketing-career',
      title: 'Digital Marketing Career Track',
      subtitle: 'From your first campaign to data-driven marketing leadership.',
      about:
        'A guided route into modern marketing. Start hands-on with a practitioner diploma, earn a full undergraduate degree specialising in digital marketing, then step up to analytics-led strategy — each stage building on the one before.',
      outcome:
        'Run end-to-end campaigns across SEO, social, content and paid ads, read the analytics behind them, and lead a marketing team.',
      stream: 'MANAGEMENT',
      skills: ['SEO', 'Social media', 'Content marketing', 'Paid ads', 'Marketing analytics', 'Campaign strategy'],
      featured: true,
      courses: ['diploma-digital-marketing', 'online-bba-digital-marketing', 'online-mba-business-analytics'],
    },
    {
      slug: 'software-data-developer',
      title: 'Software & Data Developer Track',
      subtitle: 'From your first line of code to full-stack and machine learning.',
      about:
        'Build a software career step by step: computing foundations and programming in a BCA, an in-demand data-science specialisation, and advanced software engineering in an MCA.',
      outcome:
        'Build full-stack applications, work with data and machine learning, and take on software engineering roles.',
      stream: 'IT',
      skills: ['Programming', 'Web development', 'Databases', 'Python', 'Data science', 'Software engineering'],
      featured: true,
      courses: ['online-bca', 'certificate-data-science', 'online-mca'],
    },
    {
      slug: 'finance-accounting-professional',
      title: 'Finance & Accounting Professional Track',
      subtitle: 'From commerce fundamentals to analytics-led finance roles.',
      about:
        'A commerce-to-finance progression: a strong B.Com (Hons) foundation, a postgraduate M.Com with finance and taxation depth, and an analytics MBA that turns numbers into decisions.',
      outcome:
        'Take on accounting, taxation and financial-analysis roles, and move into analytics-driven finance.',
      stream: 'COMMERCE',
      skills: ['Accounting', 'Taxation', 'Corporate law', 'Financial analysis', 'Business analytics'],
      featured: false,
      courses: ['bcom-hons-online', 'mcom-online', 'online-mba-business-analytics'],
    },
  ]
  for (const p of learningPaths) {
    const { courses: pathCourses, ...data } = p
    const created = await prisma.learningPath.create({ data })
    await prisma.learningPathCourse.createMany({
      data: pathCourses
        .map((slug, i) => ({ pathId: created.id, courseId: courseIdBySlug[slug], order: i + 1 }))
        .filter((row) => row.courseId),
    })
  }

  // ------------------------------------------------------------ application
  await prisma.application.create({
    data: {
      userId: priya.id,
      courseId: courseIdBySlug['online-mca'],
      step: 2,
      status: 'DRAFT',
      personal: {
        fullName: 'Priya Nair',
        email: 'priya@student.in',
        mobile: '+91 91234 56789',
        dob: '2001-11-02',
        gender: 'Female',
      },
    },
  })

  // ------------------------------------------------------------------- shop
  //
  // Demo catalogue. Titles are generic on purpose and the ISBNs are structurally
  // valid but invented — these stand in for stock you actually carry, exactly
  // like the seeded course catalogue. Replace before selling anything.
  await prisma.shopOrderItem.deleteMany()
  await prisma.shopOrder.deleteMany()
  await prisma.product.deleteMany()

  const books = BOOKS
  const stationery = STATIONERY

  for (const b of books) {
    const { examTags, highlights, ...rest } = b
    await prisma.product.create({
      data: {
        ...rest, kind: 'BOOK', status: 'PUBLISHED',
        examTags, highlights, specs: [], images: [],
      },
    })
  }

  for (const s of stationery) {
    const { specs, highlights, ...rest } = s
    await prisma.product.create({
      data: {
        ...rest, kind: 'STATIONERY', status: 'PUBLISHED',
        specs, highlights, examTags: [], images: [],
      },
    })
  }

  console.log('Creating promotions...')
  const promos = [
    { code: 'SAVE10', title: '10% off your order', description: 'Flat 10% off, no minimum.', type: 'PERCENT', value: 10, scope: 'SHOP', status: 'ACTIVE' },
    { code: 'WELCOME50', title: '₹50 off orders over ₹300', description: 'A welcome offer for new shoppers.', type: 'FLAT', value: 5000, scope: 'SHOP', status: 'ACTIVE', minSubtotal: 30000 },
    { code: 'BOOKS20', title: '20% off, up to ₹200', description: 'Capped percentage promo for the shop.', type: 'PERCENT', value: 20, scope: 'SHOP', status: 'ACTIVE', maxDiscount: 20000 },
  ]
  for (const p of promos) {
    await prisma.promotion.upsert({ where: { code: p.code }, update: p, create: p })
  }

  const counts = {
    universities: await prisma.university.count(),
    courses: await prisma.course.count(),
    modules: await prisma.module.count(),
    lessons: await prisma.lesson.count(),
    materials: await prisma.material.count(),
    tests: await prisma.test.count(),
    questions: await prisma.question.count(),
    enrollments: await prisma.enrollment.count(),
    products: await prisma.product.count(),
    promotions: await prisma.promotion.count(),
  }

  console.log('\nSeed complete:')
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(14)} ${v}`)
  console.log('\nAccounts:')
  console.log('  admin@academiaglobal.in / Admin@123    (admin panel)')
  console.log('  rahul@student.in        / Student@123  (student dashboard)')
  console.log('  priya@student.in        / Student@123\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
