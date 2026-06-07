import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sodium = require('libsodium-wrappers');

const DEFAULT_FILE = '.env.secrets.production';
const GITHUB_API = 'https://api.github.com';
const API_VERSION = '2022-11-28';

function parseArgs(argv) {
  const args = {
    file: DEFAULT_FILE,
    repo: null,
    tokenEnv: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--file' || current === '-f') {
      args.file = argv[++index];
      continue;
    }

    if (current === '--repo' || current === '-r') {
      args.repo = argv[++index];
      continue;
    }

    if (current === '--token-env') {
      args.tokenEnv = argv[++index];
      continue;
    }

    if (current === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (current === '--help' || current === '-h') {
      printHelpAndExit();
    }

    throw new Error(`sync_secrets_unknown_argument_${current}`);
  }

  return args;
}

function printHelpAndExit() {
  console.log([
    'sync_secrets_usage',
    '  node scripts/tools/sync-github-secrets.mjs [--file .env.secrets.production] [--repo owner/name] [--token-env GH_TOKEN] [--dry-run]',
    '',
    'sync_secrets_environment',
    '  GH_TOKEN, GITHUB_TOKEN, or the env name passed with --token-env',
  ].join('\n'));
  process.exit(0);
}

function detectRepository() {
  const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
    encoding: 'utf8',
  }).trim();

  const sshMatch = remoteUrl.match(/^git@github\.com:(.+?)\/(.+?)(?:\.git)?$/i);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }

  const httpsMatch = remoteUrl.match(/^https:\/\/github\.com\/(.+?)\/(.+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  throw new Error(`sync_secrets_detect_repo_failed_${remoteUrl}`);
}

function parseEnvValue(rawValue) {
  const value = rawValue ?? '';

  if (value.startsWith('"') && value.endsWith('"')) {
    return JSON.parse(value);
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value.trimEnd();
}

function parseSecretsFile(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const entries = [];

  for (let index = 0; index < lines.length; index += 1) {
    const originalLine = lines[index];
    const line = originalLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const heredocMatch = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)<<(.+)$/);

    if (heredocMatch) {
      const key = heredocMatch[1];
      const delimiter = heredocMatch[2].trim();
      const valueLines = [];

      index += 1;
      while (index < lines.length && lines[index] !== delimiter) {
        valueLines.push(lines[index]);
        index += 1;
      }

      if (index >= lines.length) {
        throw new Error(`sync_secrets_missing_heredoc_terminator_${delimiter}_${key}`);
      }

      entries.push({ key, value: valueLines.join('\n') });
      continue;
    }

    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex < 0) {
      throw new Error(`sync_secrets_invalid_secret_line_${originalLine}`);
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const value = parseEnvValue(normalized.slice(separatorIndex + 1));

    if (!key) {
      throw new Error(`sync_secrets_invalid_secret_key_${originalLine}`);
    }

    entries.push({ key, value });
  }

  return entries;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`sync_secrets_github_api_failed_${response.status}`);
  }

  return text ? JSON.parse(text) : {};
}

async function updateSecret({ repo, token, name, value, dryRun }) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'norge360-secret-sync',
  };

  const publicKey = await fetchJson(`${GITHUB_API}/repos/${repo}/actions/secrets/public-key`, {
    headers,
  });

  const binkey = sodium.from_base64(publicKey.key, sodium.base64_variants.ORIGINAL);
  const binsec = sodium.from_string(value);
  const encBytes = sodium.crypto_box_seal(binsec, binkey);
  const encryptedValue = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

  if (dryRun) {
    console.log(`Would sync secret: ${name}`);
    return;
  }

  await fetchJson(`${GITHUB_API}/repos/${repo}/actions/secrets/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id,
    }),
  });

  console.log(`Synced secret: ${name}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = args.repo ?? detectRepository();
  const tokenName = args.tokenEnv ?? (process.env.GH_TOKEN ? 'GH_TOKEN' : 'GITHUB_TOKEN');
  const token = process.env[tokenName];

  if (!token) {
    throw new Error(`sync_secrets_missing_token_${tokenName}`);
  }

  const filePath = path.resolve(process.cwd(), args.file);
  const fileContents = await fs.readFile(filePath, 'utf8');
  const secrets = parseSecretsFile(fileContents);
  validateProductionSecrets(secrets, args.file);

  if (secrets.length === 0) {
    throw new Error(`sync_secrets_no_secrets_${args.file}`);
  }

  await sodium.ready;

  console.log(`sync_secrets_repository_${repo}`);
  console.log(`sync_secrets_source_${filePath}`);
  if (args.dryRun) {
    console.log('sync_secrets_mode_dry_run');
  }

  for (const secret of secrets) {
    await updateSecret({
      repo,
      token,
      name: secret.key,
      value: secret.value,
      dryRun: args.dryRun,
    });
  }
}

function validateProductionSecrets(secrets, fileName) {
  const restrictedKeys = new Set([
    'AUTH_API_BASE_URL',
    'GATEWAY_API_BASE_URL',
    'INTERNAL_API_BASE_URL',
  ]);

  const problems = [];

  for (const secret of secrets) {
    if (!restrictedKeys.has(secret.key)) {
      continue;
    }

    const value = secret.value.trim();
    if (!value) {
      problems.push(`${secret.key} is empty`);
      continue;
    }

    try {
      const url = new URL(value);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        problems.push(`${secret.key} must not point to localhost in ${fileName}`);
      }
    } catch {
      problems.push(`${secret.key} must be a valid URL in ${fileName}`);
    }
  }

  if (problems.length > 0) {
    throw new Error([
      'sync_secrets_validation_failed',
      ...problems.map((problem) => `- ${problem}`),
      '',
      'sync_secrets_set_production_endpoints',
    ].join('\n'));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
