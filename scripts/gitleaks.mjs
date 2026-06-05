#!/usr/bin/env node

import { access, readdir } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const ignoredDirs = new Set([
  ".git",
  ".next",
  ".turbo",
  ".terraform",
  "coverage",
  "dist",
  "node_modules",
])

const forbiddenFilePatterns = [
  /\.pem$/i,
  /\.key$/i,
  /\.tfstate(\.backup)?$/i,
  /\.tfvars(\.json)?$/i,
]

const ignoredEnvFiles = new Set([
  ".env.local",
  ".env.local.example",
  ".env.secrets.production",
  ".env.production.local",
  ".env.test.local",
  ".env.production.example",
])

async function exists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function walk(directory, results = []) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        await walk(fullPath, results)
      }
      continue
    }

    results.push(fullPath)
  }

  return results
}

function isPotentialSecretFile(filePath) {
  return forbiddenFilePatterns.some((pattern) => pattern.test(filePath))
}

async function main() {
  const files = await walk(root)
  const findings = []

  for (const filePath of files) {
    if (!isPotentialSecretFile(filePath)) {
      continue
    }

    const relativePath = path.relative(root, filePath)
    findings.push(relativePath)
  }

  const obviousEnvFiles = files
    .map((filePath) => path.relative(root, filePath))
    .filter((relativePath) => /^\.env(\.|$)/i.test(path.basename(relativePath)))

  for (const envFile of obviousEnvFiles) {
    if (ignoredEnvFiles.has(path.basename(envFile))) {
      continue
    }

    findings.push(envFile)
  }

  if (findings.length > 0) {
    console.error("Potential secret-bearing files detected:")
    for (const finding of [...new Set(findings)].sort()) {
      console.error(`- ${finding}`)
    }
    process.exitCode = 1
    return
  }

  if (!(await exists(path.join(root, "infra", "terraform")))) {
    console.warn("No infra/terraform directory found; skipping scan.")
  }
}

await main()
