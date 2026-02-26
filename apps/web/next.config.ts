import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const INTL_REQUEST_CONFIG_PATH = "./src/i18n/request.ts"
const withNextIntl = createNextIntlPlugin(INTL_REQUEST_CONFIG_PATH)
const configDir = path.dirname(fileURLToPath(import.meta.url))

type LegacyTurboExperimental = {
  resolveAlias?: Record<string, string>
}

type NextIntlPatchedConfig = NextConfig & {
  experimental?: NextConfig["experimental"] & {
    turbo?: LegacyTurboExperimental
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  turbopack: {
    // Pin monorepo root so Next.js doesn't pick the unrelated parent bun.lock file.
    root: path.resolve(configDir, "..", ".."),
    // next-intl v3.26 injects the alias into deprecated experimental.turbo on Turbopack.
    // Add the supported Next.js 16 turbopack alias directly so production builds can resolve it.
    resolveAlias: {
      "next-intl/config": INTL_REQUEST_CONFIG_PATH,
    },
  },
  transpilePackages: ["@talimy/ui", "@talimy/shared", "@talimy/trpc"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.talimy.space" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
}

const patchedConfig = withNextIntl(nextConfig) as NextIntlPatchedConfig
const legacyTurboConfig = patchedConfig.experimental?.turbo

if (legacyTurboConfig?.resolveAlias) {
  patchedConfig.turbopack = {
    ...(patchedConfig.turbopack ?? {}),
    resolveAlias: {
      ...(patchedConfig.turbopack?.resolveAlias ?? {}),
      ...legacyTurboConfig.resolveAlias,
    },
  }

  if (patchedConfig.experimental) {
    const { turbo: _legacyTurbo, ...remainingExperimental } = patchedConfig.experimental
    patchedConfig.experimental =
      Object.keys(remainingExperimental).length > 0 ? remainingExperimental : undefined
  }
}

export default patchedConfig
