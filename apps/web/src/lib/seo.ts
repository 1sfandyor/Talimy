import type { Metadata } from "next"

import { SITE_NAME } from "@/config/site"

type BuildMetadataInput = {
  title: string
  description: string
  path?: string
}

export function buildPageMetadata({ title, description }: BuildMetadataInput): Metadata {
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
  }
}
