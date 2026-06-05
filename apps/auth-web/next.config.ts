import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

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

