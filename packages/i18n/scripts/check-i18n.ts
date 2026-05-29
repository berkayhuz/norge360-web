import { parse } from "@formatjs/icu-messageformat-parser";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");

export const DEFAULT_SUPPORTED_LOCALES = ["nb-NO", "en-US", "sv-SE", "da-DK", "de-DE"] as const;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface I18nValidationOptions {
  messagesRoot?: string;
  supportedLocales?: readonly string[];
  canonicalLocale?: string;
}

const htmlTagPattern = /<\s*\/?\s*[a-zA-Z][^>]*>/;

const fail = (message: string): never => {
  throw new Error(`[i18n:check] ${message}`);
};

const requireValue = <T>(value: T | undefined, message: string): NonNullable<T> => {
  if (value === undefined) {
    fail(message);
  }
  return value as NonNullable<T>;
};

const isObject = (value: JsonValue): value is { [key: string]: JsonValue } => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const flattenKeys = (value: JsonValue, prefix = ""): string[] => {
  if (!isObject(value)) return [prefix].filter(Boolean);

  const keys: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (isObject(nested)) {
      keys.push(...flattenKeys(nested, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
};

const collectLeafStrings = (value: JsonValue, prefix = ""): Array<{ key: string; value: string }> => {
  if (!isObject(value)) {
    if (typeof value === "string") {
      return [{ key: prefix, value }];
    }
    return [];
  }

  const result: Array<{ key: string; value: string }> = [];

  for (const [key, nested] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    result.push(...collectLeafStrings(nested, next));
  }

  return result;
};

const readJson = async (filePath: string): Promise<JsonValue> => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as JsonValue;
};

const listSubdirectories = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
};

const listJsonFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();
};

export const validateI18nMessages = async ({
  messagesRoot = path.join(packageRoot, "messages"),
  supportedLocales = DEFAULT_SUPPORTED_LOCALES,
  canonicalLocale = "en-US",
}: I18nValidationOptions = {}): Promise<void> => {
  const rootStat = await stat(messagesRoot);
  if (!rootStat.isDirectory()) {
    fail(`messages directory not found: ${messagesRoot}`);
  }

  const localeDirs = await listSubdirectories(messagesRoot);
  const expectedLocales = [...supportedLocales].sort();

  if (JSON.stringify(localeDirs) !== JSON.stringify(expectedLocales)) {
    fail(`locale folders must match SUPPORTED_LOCALES. found=${localeDirs.join(",")} expected=${expectedLocales.join(",")}`);
  }

  const canonicalPath = path.join(messagesRoot, canonicalLocale);
  const canonicalFiles = await listJsonFiles(canonicalPath);

  if (canonicalFiles.length === 0) {
    fail(`no namespace files found for ${canonicalLocale}`);
  }

  const canonicalByFile = new Map<string, JsonValue>();

  for (const file of canonicalFiles) {
    const value = await readJson(path.join(canonicalPath, file));
    canonicalByFile.set(file, value);
  }

  for (const locale of supportedLocales) {
    const localePath = path.join(messagesRoot, locale);
    const localeFiles = await listJsonFiles(localePath);

    if (JSON.stringify(localeFiles) !== JSON.stringify(canonicalFiles)) {
      fail(`namespace file mismatch in ${locale}. found=${localeFiles.join(",")} expected=${canonicalFiles.join(",")}`);
    }

    for (const file of canonicalFiles) {
      const filePath = path.join(localePath, file);
      const localeJson = await readJson(filePath);
      const canonicalJson = requireValue(canonicalByFile.get(file), `canonical file missing in map: ${file}`);

      const canonicalKeys = flattenKeys(canonicalJson).sort();
      const localeKeys = flattenKeys(localeJson).sort();

      if (JSON.stringify(localeKeys) !== JSON.stringify(canonicalKeys)) {
        fail(`key mismatch in ${locale}/${file}`);
      }

      const leafStrings = collectLeafStrings(localeJson);
      for (const { key, value } of leafStrings) {
        if (!value.trim()) {
          fail(`empty translation value in ${locale}/${file} key=${key}`);
        }

        if (htmlTagPattern.test(value)) {
          fail(`HTML tag detected in ${locale}/${file} key=${key}`);
        }

        try {
          parse(value);
        } catch {
          fail(`invalid ICU syntax in ${locale}/${file} key=${key}`);
        }
      }
    }
  }
};

const main = async () => {
  await validateI18nMessages();
  process.stdout.write("[i18n:check] OK\n");
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
