/**
 * Shared vocabulary for the enum-like String columns in schema.prisma.
 * Keep these in sync with the schema comments.
 */

export const COURSE_LEVELS = [
  { value: 'UG', label: 'Undergraduate' },
  { value: 'PG', label: 'Postgraduate' },
  { value: 'DIPLOMA', label: 'Diploma' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'INTEGRATED', label: 'Integrated' },
] as const

export const COURSE_MODES = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'DISTANCE', label: 'Distance' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'PART_TIME', label: 'Part-Time' },
] as const

export const STREAMS = [
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'ENGINEERING', label: 'Engineering' },
  { value: 'IT', label: 'IT & Software' },
  { value: 'COMMERCE', label: 'Commerce' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'LAW', label: 'Law' },
  { value: 'ARTS', label: 'Arts & Humanities' },
  { value: 'SCIENCE', label: 'Science' },
] as const

export const MATERIAL_TYPES = [
  { value: 'PDF', label: 'PDF / eBook', icon: 'FileText' },
  { value: 'NOTES', label: 'Study Notes', icon: 'NotebookPen' },
  { value: 'TEST_PAPER', label: 'Test Paper', icon: 'ClipboardList' },
  { value: 'SYLLABUS', label: 'Syllabus', icon: 'ListChecks' },
  { value: 'ASSIGNMENT', label: 'Assignment', icon: 'PenSquare' },
  { value: 'RECORDING', label: 'Recorded Class', icon: 'Video' },
] as const

export const LESSON_TYPES = ['VIDEO', 'READING', 'LIVE'] as const
export const ENROLLMENT_STATUS = ['ACTIVE', 'COMPLETED', 'PAUSED'] as const
export const APPLICATION_STATUS = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
] as const

/** Lead pipeline: a directory-listing enquiry worked toward a partner enrolment. */
export const LEAD_STATUS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const

export const DURATION_BUCKETS = [
  { value: '1', label: '1 Year' },
  { value: '2', label: '2 Years' },
  { value: '3', label: '3 Years' },
  { value: '4', label: '4+ Years' },
] as const

export const FEE_BUCKETS = [
  { value: '0-25000', label: 'Under ₹25K' },
  { value: '25000-50000', label: '₹25K – ₹50K' },
  { value: '50000-100000', label: '₹50K – ₹1L' },
  { value: '100000-', label: 'Above ₹1L' },
] as const

/** "Where did you stop?" entry points on the homepage. */
export const JOURNEY_STAGES = [
  { key: 'before-10', label: 'Before\nClass 10', icon: 'GraduationCap', tone: 'green' },
  { key: 'after-10', label: 'After\nClass 10', icon: 'BookMarked', tone: 'blue' },
  { key: 'after-12', label: 'After\nClass 12', icon: 'BookOpen', tone: 'orange' },
  { key: 'ug-incomplete', label: 'UG\nIncomplete', icon: 'School', tone: 'violet' },
  { key: 'pg-incomplete', label: 'PG\nIncomplete', icon: 'GraduationCap', tone: 'pink' },
  { key: 'working', label: 'Working\nProfessional', icon: 'Briefcase', tone: 'cyan' },
] as const

export const POPULAR_EXAMS = [
  'UPSC', 'NEET', 'SSC', 'JEE Main', 'Banking', 'CAT',
  'Railway', 'CLAT', 'CUET', 'Haryana CET',
] as const

export const TRUST_BADGES = [
  { title: 'UGC Approved', sub: 'Recognized Degrees', icon: 'ShieldCheck' },
  { title: 'Easy EMI Options', sub: 'Flexible Installments', icon: 'CreditCard' },
  { title: 'Scholarships', sub: 'For Eligible Students', icon: 'Award' },
  { title: '100% Secure', sub: 'Admission Process', icon: 'Lock' },
  { title: 'Placement Support', sub: 'Career Assistance', icon: 'Briefcase' },
  { title: '24/7 Support', sub: 'We are here to help', icon: 'Headset' },
] as const

export const SESSION_COOKIE = 'ag_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
