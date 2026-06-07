import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"
import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")
const configDir = dirname(fileURLToPath(import.meta.url))

loadWorkspaceEnv(resolve(configDir, "../..", ".env.local"))

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@workspace/ui", "@workspace/i18n"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.norge360.com",
        pathname: "/brand/logo/**",
      },
    ],
  },
}

export default withNextIntl(nextConfig)

function loadWorkspaceEnv(filePath: string) {
  if (!existsSync(filePath)) {
    return
  }

  const content = readFileSync(filePath, "utf8")
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) {
      continue
    }

    const equalsIndex = line.indexOf("=")
    if (equalsIndex === -1) {
      continue
    }

    const key = line.slice(0, equalsIndex).trim()
    if (!key || process.env[key] !== undefined) {
      continue
    }

    let value = line.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

