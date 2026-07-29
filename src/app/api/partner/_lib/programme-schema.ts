import { courseSchema } from '@/app/api/admin/_lib/course-schema'

/**
 * The partner-editable subset of a course.
 *
 * Partners describe their programme; they do not get to choose which university
 * it belongs to (forced to theirs), whether it's featured on the homepage
 * (operator-only), or its slug (generated server-side so two partners can't
 * fight over "online-bba"). Everything else — level, mode, fees, syllabus copy,
 * marketing claims — is theirs to set.
 */
export const partnerCourseSchema = courseSchema.omit({
  universityId: true,
  featured: true,
  slug: true,
})

export const partnerCourseUpdateSchema = partnerCourseSchema.partial()

export type PartnerCourseInput = ReturnType<typeof partnerCourseSchema.parse>
