/**
 * Seeds a few DIRECTORY (non-partner) universities and courses so the aggregator
 * flow is demoable: listed publicly for information + lead-gen, display-only
 * (no enrol/pay), applying raises a Lead. Idempotent (upsert by slug).
 *
 *   npx tsx scripts/seed-directory.ts
 *
 * Data is factual, public information about real institutions (names, cities,
 * indicative fees) — the "facts-only, not affiliated" directory stance. In
 * production these rows come from the AI URL-ingest (Phase 2), reviewed by a human.
 */
import { prisma } from '../src/lib/prisma'
import { slugify } from '../src/lib/utils'

type DirCourse = {
  title: string
  level: string
  mode: string
  stream: string
  durationYears: number
  feePerYear: number
  about: string
  eligibility: string
}

type DirUni = {
  slug: string
  name: string
  shortName: string
  city: string
  state: string
  estYear: number
  about: string
  approvals: string[]
  sourceUrl: string
  courses: DirCourse[]
}

const UNIS: DirUni[] = [
  {
    slug: 'university-of-delhi',
    name: 'University of Delhi',
    shortName: 'DU',
    city: 'New Delhi',
    state: 'Delhi',
    estYear: 1922,
    about:
      'A central university in New Delhi offering undergraduate and postgraduate programmes across arts, commerce, science and law through its affiliated colleges.',
    approvals: ['UGC', 'NAAC A+'],
    sourceUrl: 'https://www.du.ac.in',
    courses: [
      { title: 'B.A. (Hons) Economics', level: 'UG', mode: 'REGULAR', stream: 'ARTS', durationYears: 3, feePerYear: 16000, about: 'A three-year honours degree in economics covering micro, macro, statistics and Indian economic policy.', eligibility: 'Class 12 pass with the required CUET score.' },
      { title: 'B.Com (Hons)', level: 'UG', mode: 'REGULAR', stream: 'COMMERCE', durationYears: 3, feePerYear: 14000, about: 'An honours commerce degree covering accounting, finance, business law and taxation.', eligibility: 'Class 12 pass with commerce and the required CUET score.' },
      { title: 'M.A. Political Science', level: 'PG', mode: 'REGULAR', stream: 'ARTS', durationYears: 2, feePerYear: 12000, about: 'A postgraduate degree in political theory, comparative politics and international relations.', eligibility: "Bachelor's degree in a relevant discipline." },
    ],
  },
  {
    slug: 'university-of-mumbai',
    name: 'University of Mumbai',
    shortName: 'MU',
    city: 'Mumbai',
    state: 'Maharashtra',
    estYear: 1857,
    about:
      'One of India’s oldest universities, offering a wide range of programmes across commerce, science, arts and technology through affiliated colleges in Maharashtra.',
    approvals: ['UGC', 'NAAC A'],
    sourceUrl: 'https://mu.ac.in',
    courses: [
      { title: 'Bachelor of Management Studies (BMS)', level: 'UG', mode: 'REGULAR', stream: 'MANAGEMENT', durationYears: 3, feePerYear: 22000, about: 'An undergraduate management degree covering marketing, finance, HR and operations with an industry project.', eligibility: 'Class 12 pass in any stream.' },
      { title: 'B.Sc Information Technology', level: 'UG', mode: 'REGULAR', stream: 'IT', durationYears: 3, feePerYear: 26000, about: 'A degree in software development, databases and networking with practical labs.', eligibility: 'Class 12 pass with mathematics.' },
    ],
  },
  {
    slug: 'osmania-university',
    name: 'Osmania University',
    shortName: 'OU',
    city: 'Hyderabad',
    state: 'Telangana',
    estYear: 1918,
    about:
      'A public state university in Hyderabad offering undergraduate, postgraduate and doctoral programmes across engineering, arts, science and commerce.',
    approvals: ['UGC', 'NAAC A+', 'AICTE'],
    sourceUrl: 'https://www.osmania.ac.in',
    courses: [
      { title: 'MBA (General)', level: 'PG', mode: 'REGULAR', stream: 'MANAGEMENT', durationYears: 2, feePerYear: 35000, about: 'A two-year full-time MBA covering core management functions with electives and a summer internship.', eligibility: "Bachelor's degree with a valid entrance score." },
      { title: 'B.Tech Computer Science', level: 'UG', mode: 'REGULAR', stream: 'ENGINEERING', durationYears: 4, feePerYear: 45000, about: 'A four-year engineering degree in computing, algorithms, systems and software engineering.', eligibility: 'Class 12 with PCM and a valid entrance rank.' },
    ],
  },
]

async function main() {
  let unis = 0
  let courses = 0
  for (const u of UNIS) {
    const uni = await prisma.university.upsert({
      where: { slug: u.slug },
      update: { listed: true, sourceUrl: u.sourceUrl },
      create: {
        slug: u.slug,
        name: u.name,
        shortName: u.shortName,
        about: u.about,
        estYear: u.estYear,
        approvals: u.approvals,
        city: u.city,
        state: u.state,
        sourceUrl: u.sourceUrl,
        // Non-partner: listed for the directory, but not transactable.
        partnerStatus: 'PROSPECT',
        listed: true,
        featured: false,
        rating: 4.2,
      },
    })
    unis++

    for (const c of u.courses) {
      const slug = `${u.slug}-${slugify(c.title)}`.slice(0, 110)
      await prisma.course.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          title: c.title,
          subtitle: `${c.title} at ${u.name}`,
          level: c.level,
          mode: c.mode,
          stream: c.stream,
          durationYears: c.durationYears,
          feePerYear: c.feePerYear,
          about: c.about,
          eligibility: c.eligibility,
          highlights: [],
          skills: [],
          recruiters: [],
          source: 'DIRECTORY',
          universityId: uni.id,
          reviewStatus: 'PUBLISHED', // irrelevant for DIRECTORY, kept tidy
        },
      })
      courses++
    }
  }

  // One demo lead so the CRM has something to work.
  const dirCourse = await prisma.course.findFirst({ where: { source: 'DIRECTORY' }, select: { id: true, title: true, universityId: true, university: { select: { name: true } } } })
  const partner = await prisma.university.findFirst({ where: { partnerStatus: 'ACTIVE' }, select: { id: true } })
  if (dirCourse) {
    const exists = await prisma.lead.findFirst({ where: { email: 'demo.lead@example.com' } })
    if (!exists) {
      await prisma.lead.create({
        data: {
          name: 'Aarav Gupta',
          email: 'demo.lead@example.com',
          phone: '+91 99887 76655',
          message: 'Interested in this programme — please call to discuss options and fees.',
          source: 'directory',
          status: 'NEW',
          interestedUniversityId: dirCourse.universityId,
          interestedUniversityName: dirCourse.university.name,
          interestedCourseId: dirCourse.id,
          interestedCourseTitle: dirCourse.title,
          suggestedUniversityId: partner?.id ?? null,
        },
      })
    }
  }

  console.log(`Directory: ${unis} universities, ${courses} courses upserted (+ 1 demo lead).`)
}

main()
  .catch((err) => {
    console.error('seed-directory failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
