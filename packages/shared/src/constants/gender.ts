export const GENDERS = {
  MALE: "male",
  FEMALE: "female",
} as const

export const GENDER_SCOPES = {
  MALE: "male",
  FEMALE: "female",
  ALL: "all",
} as const

export const GENDER_POLICIES = {
  BOYS_ONLY: "boys_only",
  GIRLS_ONLY: "girls_only",
  MIXED: "mixed",
} as const

export type Gender = (typeof GENDERS)[keyof typeof GENDERS]
export type GenderScope = (typeof GENDER_SCOPES)[keyof typeof GENDER_SCOPES]
export type GenderPolicy = (typeof GENDER_POLICIES)[keyof typeof GENDER_POLICIES]
