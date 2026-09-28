/**
 * The shop product catalogue — the single source of truth for both the
 * destructive `prisma/seed.ts` and the additive `scripts/add-shop-products.ts`.
 *
 * Books carry `examTags`; stationery carries `specs`. The seed/script fill the
 * per-kind defaults (`kind`, `status`, empty `images`, etc.).
 */

export const BOOKS = [
  {
    slug: 'complete-physics-jee-main-advanced',
    title: 'Complete Physics for JEE Main & Advanced',
    subtitle: 'Concept-first theory with 3,200+ solved and practice problems',
    category: 'ENGINEERING_ENTRANCE',
    author: 'Dr. A. K. Verma', publisher: 'Shiksha Press', isbn: '9789390000011',
    edition: '2026 Edition', language: 'English', pages: 1124, binding: 'Paperback',
    publishedYear: 2025, examTags: ['JEE Main', 'JEE Advanced'],
    price: 89900, mrp: 129900, stock: 42, rating: 4.6, reviews: 318, featured: true,
    description:
      'A single-volume physics companion built for the way the JEE actually tests you. Every chapter opens with the concept in plain language, moves through worked examples that show the reasoning rather than just the algebra, and closes with a graded problem set — warm-up, exam-level, and advanced.\n\nThe advanced sets are marked separately so a Main-only aspirant can skip them without losing the thread. Answer keys carry full solutions, not just final values.',
    highlights: ['3,200+ problems with full solutions', 'Separate Main and Advanced problem tracks', 'Chapter-wise previous-year analysis', 'Formula appendix for last-week revision'],
  },
  {
    slug: 'organic-chemistry-mechanisms-neet',
    title: 'Organic Chemistry: Mechanisms & Reactions for NEET',
    subtitle: 'Reaction maps, named reactions and 1,800 NEET-pattern MCQs',
    category: 'MEDICAL_ENTRANCE',
    author: 'Dr. Sneha Iyer', publisher: 'Shiksha Press', isbn: '9789390000028',
    edition: '2026 Edition', language: 'English', pages: 742, binding: 'Paperback',
    publishedYear: 2025, examTags: ['NEET'],
    price: 64900, mrp: 89900, stock: 30, rating: 4.5, reviews: 204, featured: true,
    description:
      'Organic chemistry fails most NEET aspirants for one reason: it is memorised instead of understood. This book leads with mechanism — why an electron moves where it moves — and lets the named reactions fall out of that logic.\n\nEach chapter ends with a one-page reaction map suitable for revision, and the MCQ bank is tagged by difficulty so you can calibrate honestly.',
    highlights: ['Mechanism-first, not memorisation-first', '1,800 NEET-pattern MCQs', 'One-page reaction map per chapter', 'Common-trap callouts from past papers'],
  },
  {
    slug: 'quantitative-aptitude-banking-ssc',
    title: 'Quantitative Aptitude for Banking & SSC',
    subtitle: 'Speed methods, shortcuts and 40 full-length practice sets',
    category: 'GOVERNMENT_EXAMS',
    author: 'R. S. Prakash', publisher: 'Sarthi Publications', isbn: '9789390000035',
    edition: '9th Edition', language: 'English', pages: 896, binding: 'Paperback',
    publishedYear: 2026, examTags: ['SSC', 'Banking'],
    price: 47500, mrp: 65000, stock: 55, rating: 4.4, reviews: 512, featured: true,
    description:
      'Banking and SSC quant is a race against the clock, so this book optimises for time per question rather than elegance. Every topic carries a conventional method and a faster exam method side by side, with an honest note on when the shortcut breaks.\n\nForty full-length sets match the current pattern and timing, with a sectional cut-off tracker at the back.',
    highlights: ['Conventional and speed method, side by side', '40 full-length timed sets', 'Sectional cut-off tracker', 'Covers IBPS, SBI, RRB and SSC CGL patterns'],
  },
  {
    slug: 'cat-verbal-ability-reading-comprehension',
    title: 'CAT Verbal Ability & Reading Comprehension',
    subtitle: 'RC strategy, para-jumbles and 60 sectional tests',
    category: 'MANAGEMENT_ENTRANCE',
    author: 'Meera Raghavan', publisher: 'Sarthi Publications', isbn: '9789390000042',
    edition: '2026 Edition', language: 'English', pages: 528, binding: 'Paperback',
    publishedYear: 2025, examTags: ['CAT'],
    price: 55000, mrp: 72500, stock: 18, rating: 4.3, reviews: 147,
    description:
      'VARC rewards reading judgement more than vocabulary drills, and this book is built accordingly. The RC section teaches passage triage — deciding in thirty seconds which passages to attempt and which to leave — before it teaches question types.\n\nSixty sectional tests replicate CAT timing, and every solution explains why the wrong options are wrong, which is where most of the learning sits.',
    highlights: ['Passage triage strategy for time management', '60 CAT-timed sectional tests', 'Wrong-option analysis in every solution', 'Covers CAT, XAT and SNAP patterns'],
  },
  {
    slug: 'ncert-mathematics-class-12-companion',
    title: 'NCERT Mathematics Class 12 — Complete Companion',
    subtitle: 'Every NCERT problem solved, plus board and entrance extensions',
    category: 'SCHOOL_BOARDS',
    author: 'Prof. S. Banerjee', publisher: 'Shiksha Press', isbn: '9789390000059',
    edition: '2026 Edition', language: 'English', pages: 684, binding: 'Paperback',
    publishedYear: 2025, examTags: ['Class 12', 'JEE Main'],
    price: 42000, mrp: 55000, stock: 64, rating: 4.7, reviews: 421,
    description:
      'Every exercise in the NCERT Class 12 mathematics textbook, worked in full, with the reasoning written out rather than compressed into symbols.\n\nEach chapter then extends into board-pattern long answers and the entrance-level variants that JEE Main builds on the same concept — so one book carries a student through both examinations.',
    highlights: ['All NCERT exercises solved in full', 'Board-pattern long-answer practice', 'JEE Main extension problems per chapter', 'Previous 10 years of board questions mapped'],
  },
  {
    slug: 'indian-polity-governance-upsc',
    title: 'Indian Polity & Governance for UPSC',
    subtitle: 'Constitution, institutions and current governance, exam-mapped',
    category: 'GENERAL_STUDIES',
    author: 'Dr. Kavita Menon', publisher: 'Sarthi Publications', isbn: '9789390000066',
    edition: '7th Edition', language: 'English', pages: 812, binding: 'Paperback',
    publishedYear: 2026, examTags: ['UPSC'],
    price: 72500, mrp: 95000, stock: 26, rating: 4.6, reviews: 289,
    description:
      'Polity is the highest-yield section in the UPSC General Studies paper, and the most poorly served by rote summaries. This edition explains each constitutional provision alongside the case law and the political history that shaped it.\n\nPrelims MCQs and Mains answer frameworks are provided per chapter, with a separate section on recent amendments and landmark judgements.',
    highlights: ['Article-wise treatment with case law', 'Prelims MCQs and Mains frameworks per chapter', 'Recent amendments and judgements section', 'Answer-writing templates for GS Paper II'],
  },
  {
    slug: 'previous-year-papers-jee-main',
    title: 'JEE Main — 15 Years Solved Papers',
    subtitle: 'Every shift, chapter-wise and year-wise, fully solved',
    category: 'ENGINEERING_ENTRANCE',
    author: 'Editorial Board', publisher: 'Shiksha Press', isbn: '9789390000073',
    edition: '2026 Edition', language: 'English', pages: 968, binding: 'Paperback',
    publishedYear: 2026, examTags: ['JEE Main'],
    price: 52500, mrp: 69900, stock: 3, rating: 4.5, reviews: 376,
    description:
      'Fifteen years of JEE Main, arranged twice over: year-wise for full-paper practice under timing, and chapter-wise for topic consolidation.\n\nSolutions state the concept being tested before the working, so a wrong answer tells you which chapter to revisit rather than just which step you fumbled.',
    highlights: ['Year-wise and chapter-wise arrangement', 'All shifts including recent sessions', 'Concept tagged on every solution', 'Difficulty trend analysis per chapter'],
  },
  {
    slug: 'clat-legal-reasoning-complete',
    title: 'CLAT Legal Reasoning — Complete Guide',
    subtitle: 'Principle-fact application, legal current affairs and 30 mocks',
    category: 'GOVERNMENT_EXAMS',
    author: 'Adv. Nikhil Sharma', publisher: 'Sarthi Publications', isbn: '9789390000080',
    edition: '2026 Edition', language: 'English', pages: 596, binding: 'Paperback',
    publishedYear: 2025, examTags: ['CLAT'],
    price: 58000, mrp: 74900, stock: 0, rating: 4.2, reviews: 96,
    description:
      'CLAT legal reasoning does not test legal knowledge — it tests whether you can apply a stated principle to a set of facts without importing what you already believe. This guide drills exactly that discipline.\n\nThirty full mocks follow the current comprehension-based pattern, with legal current affairs updated through the year of publication.',
    highlights: ['Principle-fact application drills', '30 full-length mocks, current pattern', 'Legal current affairs compendium', 'Landmark judgements in plain language'],
  },
]

export const STATIONERY = [
  {
    slug: 'a4-ruled-notebook-5-pack',
    title: 'A4 Ruled Notebook — Pack of 5',
    subtitle: '200 pages each, 70 GSM bleed-resistant paper, hard bound',
    category: 'NOTEBOOKS', brand: 'Sarthi Essentials',
    specs: ['Size: A4 (210 × 297 mm)', 'Pages: 200 per notebook', 'Paper: 70 GSM', 'Ruling: Single line', 'Binding: Hard bound'],
    price: 44900, mrp: 59900, stock: 120, rating: 4.4, reviews: 233, featured: true,
    description:
      'A five-notebook pack sized for a full semester of lecture notes. The 70 GSM paper takes gel and fountain ink without ghosting onto the reverse, which matters when you write on both sides.\n\nHard covers survive a year in a bag; the binding lies flat so you are not fighting the spine while writing.',
    highlights: ['70 GSM — no ink bleed-through', 'Lies flat when open', '200 pages × 5 notebooks', 'Hard cover, semester-durable'],
  },
  {
    slug: 'gel-pen-blue-pack-of-10',
    title: 'Smooth-Flow Gel Pens, Blue — Pack of 10',
    subtitle: '0.7 mm tip, quick-dry ink, cushioned grip',
    category: 'WRITING', brand: 'Sarthi Essentials',
    specs: ['Tip: 0.7 mm', 'Ink: Quick-dry gel, blue', 'Quantity: 10 pens', 'Grip: Cushioned rubber', 'Write length: ~1,800 m per pen'],
    price: 24900, mrp: 34900, stock: 200, rating: 4.5, reviews: 587, featured: true,
    description:
      'Ten pens built for long writing sessions. The quick-dry ink is the point: in a three-hour paper, a smudged left hand costs marks.\n\nThe cushioned grip and 0.7 mm tip keep handwriting legible into the third hour, which is where most exam handwriting collapses.',
    highlights: ['Quick-dry — no smudging for left-handers', 'Cushioned grip for long papers', '~1,800 m write length per pen', 'Exam-approved blue ink'],
  },
  {
    slug: 'geometry-box-complete',
    title: 'Complete Geometry Box',
    subtitle: 'Compass, divider, set squares, protractor and scale in a metal case',
    category: 'GEOMETRY', brand: 'Sarthi Essentials',
    specs: ['Case: Powder-coated metal', 'Compass: Self-centring, locking', 'Set squares: 45° and 30°/60°', 'Protractor: 180°, 1° graduation', 'Scale: 15 cm steel'],
    price: 29900, mrp: 42500, stock: 85, rating: 4.3, reviews: 174,
    description:
      'A geometry set that holds its calibration. The compass locks rather than drifting mid-arc, and the steel scale will not warp the way plastic does in a hot bag.\n\nGraduations are printed to 1° on the protractor and etched rather than surface-printed on the scale, so they survive being used.',
    highlights: ['Locking self-centring compass', 'Etched — not printed — graduations', 'Steel scale, warp-resistant', 'Metal case fits a pencil pouch'],
  },
  {
    slug: 'exam-day-clear-pouch',
    title: 'Exam Day Transparent Pouch',
    subtitle: 'Clear PVC pouch meeting common entrance-exam stationery rules',
    category: 'EXAM_ESSENTIALS', brand: 'Sarthi Essentials',
    specs: ['Material: Transparent PVC', 'Size: 22 × 12 cm', 'Closure: Zip', 'Contents: Pouch only'],
    price: 9900, mrp: 14900, stock: 150, rating: 4.1, reviews: 88,
    description:
      'Most national entrance examinations require stationery to be carried in a transparent pouch so invigilators can see the contents without unpacking your desk.\n\nThis is that pouch: clear on all faces, sized to hold pens, an admit card and a transparent water bottle label.\n\nAlways confirm the current stationery rules in your own admit card — they change between sessions and between examinations.',
    highlights: ['Clear on all faces for invigilator checks', 'Fits pens, admit card and ID', 'Zip closure, 22 × 12 cm', 'Check your admit card for current rules'],
  },
  {
    slug: 'highlighter-pastel-set-6',
    title: 'Pastel Highlighter Set — 6 Shades',
    subtitle: 'Chisel tip, low-bleed ink for textbooks and notes',
    category: 'WRITING', brand: 'Sarthi Essentials',
    specs: ['Tip: Chisel, 1–5 mm', 'Shades: 6 pastel colours', 'Ink: Low-bleed, water-based', 'Quantity: 6 markers'],
    price: 19900, mrp: 27500, stock: 4, rating: 4.6, reviews: 312,
    description:
      'Pastel shades chosen so text stays readable underneath — the fluorescent yellows most sets ship with actively reduce contrast on thin textbook paper.\n\nThe chisel tip gives a 1 mm underline or a 5 mm block from the same marker, and the water-based ink does not bleed through NCERT-weight pages.',
    highlights: ['Pastel — text stays readable', 'Low-bleed on thin textbook paper', 'Chisel tip: 1 mm to 5 mm', 'Six colours for topic coding'],
  },
  {
    slug: 'desk-organiser-study',
    title: 'Study Desk Organiser',
    subtitle: 'Five compartments for pens, notes and devices',
    category: 'DESK', brand: 'Sarthi Essentials',
    specs: ['Material: High-impact polystyrene', 'Compartments: 5', 'Size: 24 × 14 × 12 cm', 'Includes: Phone slot, sticky-note tray'],
    price: 34900, mrp: 49900, stock: 40, rating: 4.2, reviews: 61,
    description:
      'A desk organiser scaled for a study table rather than an office desk: tall slots for pens and scales, a shallow tray for sticky notes, and an angled phone slot that keeps a screen visible for a timer without it lying flat among your papers.',
    highlights: ['Five compartments including phone slot', 'Tall slots fit 15 cm scales', 'Sticky-note tray', 'Wipe-clean, high-impact body'],
  },
]
