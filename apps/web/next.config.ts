import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")
const configDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  turbopack: {
    // Pin monorepo root so Next.js doesn't pick the unrelated parent bun.lock file.
    root: path.resolve(configDir, "..", ".."),
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

export default withNextIntl(nextConfig)
