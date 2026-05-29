import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@norge360/ui"],
}

export default nextConfig