/**
 * Additive demo data: creates "Punjab University" as an ACTIVE partner plus a
 * handful of published courses, so they appear on the public /courses page.
 *
 * Unlike `prisma/seed.ts`, this does NOT wipe anything — it upserts by slug, so
 * it's safe to run against a database that already has data, and safe to re-run.
 *
 *   $env:DATABASE_URL="<prod DATABASE_PUBLIC_URL>"; npm run db:punjab   (PowerShell)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const uni = await prisma.university.upsert({
    where: { slug: 'punjab-university' },
    update: { partnerStatus: 'ACTIVE', listed: true },
    create: {
      slug: 'punjab-university',
      name: 'Punjab University',
      shortName: 'PU',
      about:
        'Punjab University is a NAAC A+ accredited, UGC-entitled institution offering online and distance degree programmes for working professionals and students across India.',
      estYear: 1882,
      naacGrade: 'A+',
      approvals: ['UGC', 'NAAC A+', 'AICTE', 'AIU'],
      rating: 4.5,
      reviews: 312,
      students: 42000,
      programs: 6,
      city: 'Chandigarh',
      state: 'Punjab',
      website: 'https://www.puchd.ac.in',
      featured: true,
      listed: true,
      partnerStatus: 'ACTIVE',
      commissionPct: 12,
    },
  })
  console.log(`University ready: ${uni.name} (${uni.id})`)

  const courses = [
    {
      slug: 'pu-online-mba',
      title: 'Online MBA',
      subtitle: 'A UGC-entitled Master of Business Administration, built for working professionals.',
      level: 'PG', mode: 'ONLINE', stream: 'MANAGEMENT',
      durationYears: 2, feePerYear: 90000, originalFee: 120000, discountPct: 25,
      about:
        'Master core management with specialisations in Marketing, Finance, HR and Business Analytics. Live weekend classes, recorded lectures and industry projects — fully online.',
      eligibility: 'Bachelor’s degree in any discipline with 50% aggregate (45% for reserved categories).',
      highlights: ['UGC-entitled degree', 'Live + recorded classes', '4 specialisations', 'Placement assistance', 'No-cost EMI available'],
      skills: ['Business strategy', 'Financial analysis', 'Marketing management', 'Data-driven decisions', 'Leadership'],
      recruiters: ['Deloitte', 'HDFC Bank', 'Wipro', 'Amazon', 'ICICI'],
      rating: 4.6, reviews: 148, featured: true,
    },
    {
      slug: 'pu-online-bba',
      title: 'Online BBA',
      subtitle: 'Bachelor of Business Administration — your foundation in modern business.',
      level: 'UG', mode: 'ONLINE', stream: 'MANAGEMENT',
      durationYears: 3, feePerYear: 45000, originalFee: 60000, discountPct: 25,
      about:
        'Build a strong base in management, marketing, finance and entrepreneurship with a flexible online BBA designed for 12th-pass students and early professionals.',
      eligibility: '10+2 (any stream) with 50% aggregate from a recognised board.',
      highlights: ['UGC-entitled degree', '100% online', 'Industry-aligned syllabus', 'Soft-skills training', 'Pathway to MBA'],
      skills: ['Management basics', 'Marketing', 'Accounting', 'Communication', 'Teamwork'],
      recruiters: ['TCS', 'Infosys', 'Reliance Retail', 'Flipkart', 'Zomato'],
      rating: 4.4, reviews: 96,
    },
    {
      slug: 'pu-online-bca',
      title: 'Online BCA',
      subtitle: 'Bachelor of Computer Applications — launch your career in tech.',
      level: 'UG', mode: 'ONLINE', stream: 'IT',
      durationYears: 3, feePerYear: 40000, originalFee: 55000, discountPct: 27,
      about:
        'Learn programming, web development, databases and data structures with hands-on labs. An industry-ready online BCA for aspiring developers and analysts.',
      eligibility: '10+2 with Mathematics or Computer Science, 50% aggregate.',
      highlights: ['UGC-entitled degree', 'Coding labs & projects', 'Web + software tracks', 'Internship support', 'Pathway to MCA'],
      skills: ['Programming (C, Java, Python)', 'Web development', 'Databases', 'Data structures', 'Problem solving'],
      recruiters: ['Cognizant', 'Accenture', 'Tech Mahindra', 'Capgemini', 'Paytm'],
      rating: 4.5, reviews: 121,
    },
    {
      slug: 'pu-online-mca',
      title: 'Online MCA',
      subtitle: 'Master of Computer Applications — advanced skills for software careers.',
      level: 'PG', mode: 'ONLINE', stream: 'IT',
      durationYears: 2, feePerYear: 55000, originalFee: 70000, discountPct: 21,
      about:
        'Go deeper into full-stack development, cloud, AI/ML foundations and software engineering. A career-focused online MCA with a capstone project.',
      eligibility: 'BCA / B.Sc (CS/IT) or a Bachelor’s with Mathematics, 50% aggregate.',
      highlights: ['UGC-entitled degree', 'Full-stack & cloud', 'AI/ML foundations', 'Capstone project', 'Placement assistance'],
      skills: ['Full-stack development', 'Cloud computing', 'DBMS', 'Software engineering', 'AI/ML basics'],
      recruiters: ['Microsoft', 'IBM', 'Oracle', 'HCLTech', 'Swiggy'],
      rating: 4.6, reviews: 84,
    },
    {
      slug: 'pu-distance-bcom',
      title: 'B.Com (Distance)',
      subtitle: 'Bachelor of Commerce — accounting, finance and taxation.',
      level: 'UG', mode: 'DISTANCE', stream: 'COMMERCE',
      durationYears: 3, feePerYear: 30000, originalFee: 40000, discountPct: 25,
      about:
        'A flexible distance B.Com covering financial accounting, business law, economics and taxation — ideal for students balancing work or other commitments.',
      eligibility: '10+2 (Commerce preferred) with 45% aggregate.',
      highlights: ['UGC-entitled degree', 'Distance / self-paced', 'Taxation & GST modules', 'Exam centres nationwide', 'Affordable fees'],
      skills: ['Financial accounting', 'Taxation', 'Business law', 'Economics', 'Auditing'],
      recruiters: ['Deloitte', 'KPMG', 'Axis Bank', 'Bajaj Finserv', 'Local CA firms'],
      rating: 4.3, reviews: 67,
    },
    {
      slug: 'pu-distance-ma-english',
      title: 'MA English (Distance)',
      subtitle: 'Master of Arts in English literature and language.',
      level: 'PG', mode: 'DISTANCE', stream: 'ARTS',
      durationYears: 2, feePerYear: 28000, originalFee: 35000, discountPct: 20,
      about:
        'Study British, Indian and world literature, literary theory and academic writing. A distance MA English suited to teaching, content and civil-services aspirants.',
      eligibility: 'Bachelor’s degree in any discipline with 45% aggregate.',
      highlights: ['UGC-entitled degree', 'Distance / self-paced', 'Literary theory & criticism', 'Academic writing', 'UGC-NET preparation aid'],
      skills: ['Literary analysis', 'Academic writing', 'Critical theory', 'Research', 'Communication'],
      recruiters: ['Schools & colleges', 'Publishing houses', 'Content agencies', 'EdTech firms', 'Media'],
      rating: 4.2, reviews: 41,
    },
  ]

  for (const c of courses) {
    const { slug, ...rest } = c
    await prisma.course.upsert({
      where: { slug },
      update: { reviewStatus: 'PUBLISHED', universityId: uni.id, ...rest },
      create: { slug, universityId: uni.id, ...rest },
    })
    console.log(`  course: ${c.title}`)
  }

  console.log(`\nDone — ${uni.name} + ${courses.length} published courses.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
