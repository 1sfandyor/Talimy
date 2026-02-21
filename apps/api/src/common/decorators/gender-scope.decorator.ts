import { SetMetadata } from "@nestjs/common"

export const GENDER_SCOPE_KEY = "genderScope"

export type GenderScope = "male" | "female" | "all"

export const GenderScope = (scope: GenderScope) => SetMetadata(GENDER_SCOPE_KEY, scope)
