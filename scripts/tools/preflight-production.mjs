#!/usr/bin/env node

import { access } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

const requiredPaths = [
  "package.json",
  "docker-compose.yml",
  "Caddyfile",
  "Dockerfile.public-web",
  "Dockerfile.auth-web",
  "infra/terraform",
  "k8s/production",
  ".husky/pre-commit",
  ".husky/pre-push",
]

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath))
    return true
  } catch {
    return false
  }
}

async function main() {
  const missing = []

  for (const relativePath of requiredPaths) {
    if (!(await exists(relativePath))) {
      missing.push(relativePath)
    }
  }

  if (missing.length > 0) {
    console.error("Production preflight failed. Missing required paths:")
    for (const item of missing) {
      console.error(`- ${item}`)
    }
    process.exitCode = 1
    return
  }

  console.log("Production preflight checks passed.")
}

await main()
