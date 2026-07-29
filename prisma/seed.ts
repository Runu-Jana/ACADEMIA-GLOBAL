import { PrismaClient } from '@prisma/client'
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

const universities = [
  {
    slug: 'amity-university-online',
    name: 'Amity University Online',
    shortName: 'Amity',
    about:
      'Amity University Online is one of India’s leading online education platforms offering industry-relevant programs with world-class faculty, advanced learning tools and excellent placement support. Its degrees carry the same weight as on-campus programs and are recognised by employers across India and abroad.',
    estYear: 2005,
    naacGrade: 'A+',
    approvals: ['UGC Entitled', 'NAAC A+', 'AICTE Approved', 'WES Recognised'],
    rating: 4.5,
    reviews: 12345,
    students: 50000,
    programs: 200,
    city: 'Noida',
    state: 'Uttar Pradesh',
    featured: true,
  },
  {
    slug: 'manipal-university-online',
    name: 'Manipal University Online',
    shortName: 'Manipal',
    about:
      'Manipal University Online brings seven decades of academic excellence to the digital classroom. Programs are designed with industry partners, taught by the same faculty who teach on campus, and backed by a dedicated placement cell.',
    estYear: 1953,
    naacGrade: 'A+',
    approvals: ['UGC Entitled', 'NAAC A+', 'AICTE Approved'],
    rating: 4.4,
    reviews: 9820,
    students: 42000,
    programs: 160,
    city: 'Manipal',
    state: 'Karnataka',
    featured: true,
  },
  {
    slug: 'chandigarh-university-online',
    name: 'Chandigarh University Online',
    shortName: 'Chandigarh',
    about:
      'Chandigarh University Online delivers flexible, career-focused degrees with live mentoring, recorded lectures and a strong placement network of 900+ recruiters.',
    estYear: 2012,
    naacGrade: 'A+',
    approvals: ['UGC Entitled', 'NAAC A+', 'AICTE Approved'],
    rating: 4.6,
    reviews: 7640,
    students: 35000,
    programs: 120,
    city: 'Mohali',
    state: 'Punjab',
    featured: true,
  },
  {
    slug: 'lpu-online',
    name: 'LPU Online',
    shortName: 'LPU',
    about:
      'Lovely Professional University Online offers UGC-entitled degrees with global exposure, industry projects and one of the largest placement drives in North India.',
    estYear: 2005,
    naacGrade: 'A++',
    approvals: ['UGC Entitled', 'NAAC A++', 'AICTE Approved'],
    rating: 4.6,
    reviews: 11200,
    students: 48000,
    programs: 140,
    city: 'Jalandhar',
    state: 'Punjab',
    featured: true,
  },
  {
    slug: 'jain-university-online',
    name: 'Jain University Online',
    shortName: 'Jain',
    about:
      'Jain (Deemed-to-be University) Online focuses on entrepreneurship, technology and management education with immersive digital classrooms and industry certifications bundled into the degree.',
    estYear: 1990,
    naacGrade: 'A++',
    approvals: ['UGC Entitled', 'NAAC A++', 'AICTE Approved'],
    rating: 4.5,
    reviews: 6430,
    students: 28000,
    programs: 95,
    city: 'Bengaluru',
    state: 'Karnataka',
    featured: true,
  },
  {
    slug: 'dy-patil-university-online',
    name: 'DY Patil University Online',
    shortName: 'DY Patil',
    about:
      'DY Patil University Online blends management and healthcare-adjacent programs with a practice-first curriculum and strong corporate tie-ups in Western India.',
    estYear: 2002,
    naacGrade: 'A+',
    approvals: ['UGC Entitled', 'NAAC A+'],
    rating: 4.3,
    reviews: 4180,
    students: 21000,
    programs: 70,
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    featured: true,
  },
  {
    slug: 'ignou',
    name: 'IGNOU',
    shortName: 'IGNOU',
    about:
      'Indira Gandhi National Open University is India’s largest open university, offering affordable, UGC-DEB approved distance programs to learners in every district of the country.',
    estYear: 1985,
    naacGrade: 'A++',
    approvals: ['UGC-DEB Approved', 'NAAC A++'],
    rating: 4.5,
    reviews: 20140,
    students: 300000,
    programs: 250,
    city: 'New Delhi',
    state: 'Delhi',
    featured: true,
  },
]

type CourseSeed = {
  slug: string
  title: string
  subtitle: string
  level: string
  mode: string
  stream: string
  durationYears: number
  feePerYear: number
  originalFee?: number
  university: string
  about: string
  eligibility: string
  highlights: string[]
  skills: string[]
  recruiters: string[]
  rating: number
  reviews: number
  featured?: boolean
  hasLiveClass?: boolean
  hasPlacement?: boolean
}

const courses: CourseSeed[] = [
  {
    slug: 'online-bba-digital-marketing',
    title: 'Online BBA in Digital Marketing',
    subtitle: 'Specialise in digital marketing, social media, SEO, content & analytics.',
    level: 'UG',
    mode: 'ONLINE',
    stream: 'MANAGEMENT',
    durationYears: 3,
    feePerYear: 55000,
    originalFee: 70000,
    university: 'manipal-university-online',
    about:
      'This Online BBA in Digital Marketing is designed to provide a strong foundation in management along with advanced digital marketing skills. Learn from industry experts and work on real-world projects covering SEO, social media, content strategy, analytics and paid advertising to build high-demand skills for the digital world.',
    eligibility: '10+2 or equivalent from a recognised board with minimum 50% marks',
    highlights: [
      'UGC Entitled Degree',
      'Industry-Oriented Curriculum',
      'Live Classes & Recorded Lectures',
      'Assignments & Case Studies',
      'Internship Opportunities',
      'Placement Assistance',
    ],
    skills: [
      'Digital Marketing', 'SEO & SEM', 'Social Media Marketing', 'Google Analytics',
      'Content Marketing', 'Email Marketing', 'Brand Management', 'Web Analytics',
    ],
    recruiters: ['Deloitte', 'Amazon', 'Infosys', 'HDFC Bank', 'Wipro', 'TCS'],
    rating: 4.5,
    reviews: 2345,
    featured: true,
  },
  {
    slug: 'bachelor-of-business-administration',
    title: 'Bachelor of Business Administration (BBA)',
    subtitle: 'Build a strong foundation in business management, leadership & entrepreneurship.',
    level: 'UG',
    mode: 'ONLINE',
    stream: 'MANAGEMENT',
    durationYears: 3,
    feePerYear: 45000,
    originalFee: 60000,
    university: 'amity-university-online',
    about:
      'A comprehensive undergraduate program covering the full breadth of business administration — accounting, marketing, human resources, operations and strategy — with a capstone entrepreneurship project in the final year.',
    eligibility: '10+2 or equivalent from a recognised board',
    highlights: [
      'UGC Entitled Degree', 'AI-Powered Learning Support', 'Placement Assistance',
      'Flexible EMI Options', 'Industry Case Studies',
    ],
    skills: ['Business Strategy', 'Financial Accounting', 'Marketing Management', 'Operations', 'Leadership'],
    recruiters: ['Deloitte', 'ICICI Bank', 'Amazon', 'Accenture', 'Kotak'],
    rating: 4.6,
    reviews: 3110,
    featured: true,
  },
  {
    slug: 'bba-international-business',
    title: 'BBA in International Business',
    subtitle: 'Learn global business practices, international trade, finance & cross-cultural management.',
    level: 'UG',
    mode: 'ONLINE',
    stream: 'MANAGEMENT',
    durationYears: 3,
    feePerYear: 50000,
    originalFee: 65000,
    university: 'lpu-online',
    about:
      'Designed for learners who want a career spanning borders. Covers export-import documentation, foreign exchange, global supply chains and cross-cultural negotiation with live projects on real trade scenarios.',
    eligibility: '10+2 or equivalent with minimum 50% marks',
    highlights: ['UGC Entitled Degree', 'Global Exposure Modules', 'Placement Assistance', 'Live Mentoring'],
    skills: ['International Trade', 'Forex', 'Global Supply Chain', 'Cross-Cultural Management', 'Export Documentation'],
    recruiters: ['Maersk', 'DHL', 'Infosys', 'Wipro', 'Reliance'],
    rating: 4.4,
    reviews: 1580,
    featured: true,
  },
  {
    slug: 'bba-finance-accounting',
    title: 'BBA in Finance & Accounting',
    subtitle: 'Focus on financial management, accounting, banking and investment strategies.',
    level: 'UG',
    mode: 'DISTANCE',
    stream: 'COMMERCE',
    durationYears: 3,
    feePerYear: 18000,
    originalFee: 24000,
    university: 'ignou',
    about:
      'An affordable, UGC-DEB approved distance program building deep competence in financial accounting, corporate finance, taxation and investment analysis, with printed and digital study material.',
    eligibility: '10+2 or equivalent from a recognised board',
    highlights: ['UGC-DEB Approved', 'Printed + Digital Study Material', 'Exam Support', 'Lowest Fees'],
    skills: ['Financial Accounting', 'Corporate Finance', 'Taxation', 'Investment Analysis', 'Auditing'],
    recruiters: ['SBI', 'HDFC Bank', 'Deloitte', 'EY', 'PwC'],
    rating: 4.5,
    reviews: 4210,
    featured: true,
    hasLiveClass: false,
  },
  {
    slug: 'online-mba-business-analytics',
    title: 'Online MBA in Business Analytics',
    subtitle: 'Turn data into decisions with Python, SQL, visualisation and predictive modelling.',
    level: 'PG',
    mode: 'ONLINE',
    stream: 'MANAGEMENT',
    durationYears: 2,
    feePerYear: 110000,
    originalFee: 140000,
    university: 'amity-university-online',
    about:
      'A two-year postgraduate program that pairs core MBA fundamentals with a rigorous analytics track — Python, SQL, Power BI, statistics and machine learning applied to real business problems.',
    eligibility: 'Bachelor’s degree in any discipline with minimum 50% marks',
    highlights: [
      'UGC Entitled Degree', 'Capstone Analytics Project', 'Industry Certifications Included',
      'Live Classes & Recorded Lectures', 'Dedicated Placement Cell',
    ],
    skills: ['Python', 'SQL', 'Power BI', 'Statistics', 'Machine Learning', 'Business Strategy'],
    recruiters: ['Deloitte', 'Amazon', 'Flipkart', 'Accenture', 'ZS Associates'],
    rating: 4.7,
    reviews: 1890,
    featured: true,
  },
  {
    slug: 'online-mca',
    title: 'Online MCA (Master of Computer Applications)',
    subtitle: 'Advanced software engineering, cloud, and full-stack development.',
    level: 'PG',
    mode: 'ONLINE',
    stream: 'IT',
    durationYears: 2,
    feePerYear: 75000,
    originalFee: 95000,
    university: 'chandigarh-university-online',
    about:
      'Build production-grade software skills across full-stack development, cloud infrastructure, DBMS and system design, with a capstone deployed to a live environment.',
    eligibility: 'Bachelor’s degree with Mathematics at 10+2 or graduation level',
    highlights: ['UGC Entitled Degree', 'Cloud Lab Access', 'Capstone Project', 'Placement Assistance'],
    skills: ['Java', 'Full Stack Development', 'Cloud Computing', 'DBMS', 'System Design'],
    recruiters: ['TCS', 'Infosys', 'Cognizant', 'Wipro', 'Tech Mahindra'],
    rating: 4.5,
    reviews: 2240,
  },
  {
    slug: 'online-bca',
    title: 'Online BCA (Bachelor of Computer Applications)',
    subtitle: 'Programming, web development, databases and computing fundamentals.',
    level: 'UG',
    mode: 'ONLINE',
    stream: 'IT',
    durationYears: 3,
    feePerYear: 42000,
    originalFee: 55000,
    university: 'jain-university-online',
    about:
      'A hands-on undergraduate computing degree. Start from programming fundamentals and progress to web development, databases and software engineering, building a portfolio of deployed projects along the way.',
    eligibility: '10+2 in any stream from a recognised board',
    highlights: [
      'UGC Entitled Degree', 'Hands-on Coding Labs', 'Industry Certifications',
      'Portfolio Projects', 'Placement Assistance',
    ],
    skills: ['C & C++', 'Python', 'Web Development', 'DBMS', 'Data Structures', 'Git'],
    recruiters: ['Infosys', 'Zoho', 'Mindtree', 'Capgemini', 'HCL'],
    rating: 4.4,
    reviews: 1975,
    featured: true,
  },
  {
    slug: 'bcom-hons-online',
    title: 'B.Com (Hons) Online',
    subtitle: 'Commerce, taxation and corporate law with a professional-exam aligned syllabus.',
    level: 'UG',
    mode: 'ONLINE',
    stream: 'COMMERCE',
    durationYears: 3,
    feePerYear: 38000,
    originalFee: 48000,
    university: 'dy-patil-university-online',
    about:
      'An honours commerce degree aligned to CA/CS foundation syllabi, covering advanced accounting, GST, corporate law and financial reporting.',
    eligibility: '10+2 with Commerce or equivalent',
    highlights: ['UGC Entitled Degree', 'CA/CS Aligned Syllabus', 'Exam Preparation Support'],
    skills: ['Advanced Accounting', 'GST', 'Corporate Law', 'Financial Reporting', 'Cost Accounting'],
    recruiters: ['EY', 'KPMG', 'Grant Thornton', 'HDFC Bank'],
    rating: 4.3,
    reviews: 1320,
  },
  {
    slug: 'mcom-online',
    title: 'M.Com Online',
    subtitle: 'Postgraduate commerce with specialisation in finance and taxation.',
    level: 'PG',
    mode: 'DISTANCE',
    stream: 'COMMERCE',
    durationYears: 2,
    feePerYear: 16000,
    originalFee: 20000,
    university: 'ignou',
    about:
      'A postgraduate commerce program for working professionals, focused on advanced financial management, research methodology and applied taxation.',
    eligibility: 'B.Com or equivalent bachelor’s degree',
    highlights: ['UGC-DEB Approved', 'Lowest Fees', 'Study Material Included'],
    skills: ['Financial Management', 'Research Methods', 'Taxation', 'Managerial Economics'],
    recruiters: ['SBI', 'LIC', 'Deloitte', 'PwC'],
    rating: 4.4,
    reviews: 2870,
    hasLiveClass: false,
  },
  {
    slug: 'ma-english-online',
    title: 'Online MA in English',
    subtitle: 'Literature, linguistics and critical theory for educators and writers.',
    level: 'PG',
    mode: 'DISTANCE',
    stream: 'ARTS',
    durationYears: 2,
    feePerYear: 14000,
    originalFee: 18000,
    university: 'ignou',
    about:
      'Explore British, American and Indian writing in English alongside literary theory and linguistics — a strong base for teaching, publishing, UGC-NET and civil services preparation.',
    eligibility: 'Bachelor’s degree in any discipline',
    highlights: ['UGC-DEB Approved', 'NET/JRF Aligned', 'Affordable Fees'],
    skills: ['Literary Criticism', 'Linguistics', 'Academic Writing', 'Comparative Literature'],
    recruiters: ['Kendriya Vidyalaya', 'Pearson', 'Byju’s', 'Scholastic'],
    rating: 4.4,
    reviews: 1640,
    hasLiveClass: false,
    hasPlacement: false,
  },
  {
    slug: 'btech-cse-regular',
    title: 'B.Tech in Computer Science & Engineering',
    subtitle: 'On-campus engineering degree with labs, internships and campus placements.',
    level: 'UG',
    mode: 'REGULAR',
    stream: 'ENGINEERING',
    durationYears: 4,
    feePerYear: 160000,
    originalFee: 185000,
    university: 'lpu-online',
    about:
      'A four-year on-campus engineering program with specialisation tracks in AI, cybersecurity and cloud, backed by one of India’s largest campus placement drives.',
    eligibility: '10+2 with Physics, Chemistry and Mathematics; valid entrance score',
    highlights: ['AICTE Approved', 'On-Campus Labs', 'Internship Guaranteed', 'Campus Placements'],
    skills: ['Data Structures', 'Operating Systems', 'Machine Learning', 'Cybersecurity', 'Cloud'],
    recruiters: ['Microsoft', 'Amazon', 'Google', 'Cisco', 'Bosch'],
    rating: 4.6,
    reviews: 5210,
  },
  {
    slug: 'ba-llb-integrated',
    title: 'BA LLB (Integrated Law)',
    subtitle: 'Five-year integrated law degree with moot courts and internships.',
    level: 'INTEGRATED',
    mode: 'REGULAR',
    stream: 'LAW',
    durationYears: 5,
    feePerYear: 125000,
    originalFee: 145000,
    university: 'chandigarh-university-online',
    about:
      'A Bar Council recognised integrated law program combining humanities with core legal study, moot court practice and mandatory chamber internships.',
    eligibility: '10+2 with minimum 50% marks; CLAT/entrance score preferred',
    highlights: ['Bar Council Recognised', 'Moot Court Training', 'Chamber Internships'],
    skills: ['Constitutional Law', 'Criminal Law', 'Corporate Law', 'Legal Research', 'Advocacy'],
    recruiters: ['Khaitan & Co', 'AZB & Partners', 'Trilegal', 'Cyril Amarchand'],
    rating: 4.5,
    reviews: 980,
  },
  {
    slug: 'diploma-digital-marketing',
    title: 'Diploma in Digital Marketing',
    subtitle: 'One-year practitioner diploma covering paid ads, SEO and analytics.',
    level: 'DIPLOMA',
    mode: 'ONLINE',
    stream: 'MANAGEMENT',
    durationYears: 1,
    feePerYear: 28000,
    originalFee: 36000,
    university: 'amity-university-online',
    about:
      'A fast, practical diploma for career switchers. Run live ad campaigns, audit real websites and finish with a portfolio and Google/Meta certification preparation.',
    eligibility: '10+2 or equivalent; working professionals welcome',
    highlights: ['1-Year Fast Track', 'Live Campaign Projects', 'Certification Prep', 'Weekend Batches'],
    skills: ['Google Ads', 'Meta Ads', 'SEO', 'Analytics', 'Copywriting'],
    recruiters: ['Dentsu', 'Ogilvy', 'Zomato', 'Swiggy'],
    rating: 4.4,
    reviews: 860,
  },
  {
    slug: 'certificate-data-science',
    title: 'Certificate in Data Science',
    subtitle: 'Short-format certificate in Python, statistics and machine learning.',
    level: 'CERTIFICATE',
    mode: 'PART_TIME',
    stream: 'IT',
    durationYears: 1,
    feePerYear: 22000,
    originalFee: 30000,
    university: 'jain-university-online',
    about:
      'An evening-batch certificate for working professionals moving into data roles. Python, pandas, statistics, visualisation and a supervised-learning capstone.',
    eligibility: 'Graduation in any discipline; basic mathematics recommended',
    highlights: ['Evening Batches', 'Capstone Project', 'Industry Mentors', 'Placement Support'],
    skills: ['Python', 'pandas', 'Statistics', 'scikit-learn', 'Data Visualisation'],
    recruiters: ['Fractal', 'Mu Sigma', 'TCS', 'Accenture'],
    rating: 4.5,
    reviews: 640,
  },
]

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
      name: 'Academia Admin',
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
        'We run online BBA, BCA and MBA programmes and would like to list them on Academia Global.',
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
        'Issued by Academia Global Virtual Learning.',
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
        'I had to drop my studies after 12th due to financial problems. Academia Global helped me complete my BBA through distance learning. Today I am working in a top MNC.',
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

  const counts = {
    universities: await prisma.university.count(),
    courses: await prisma.course.count(),
    modules: await prisma.module.count(),
    lessons: await prisma.lesson.count(),
    materials: await prisma.material.count(),
    tests: await prisma.test.count(),
    questions: await prisma.question.count(),
    enrollments: await prisma.enrollment.count(),
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
