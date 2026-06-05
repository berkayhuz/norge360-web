import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateI18nMessages } from "../scripts/check-i18n";

const makeFixture = async (builder: (root: string) => Promise<void>) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "norge360-i18n-"));
  try {
    await builder(root);
    return root;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
};

const createLocale = async (root: string, locale: string, commonValue = "Hello", extra: Record<string, string> = {}) => {
  const dir = path.join(root, locale);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "common.json"), JSON.stringify({ save: commonValue, ...extra }), "utf8");
};

describe("i18n validation script", () => {
  it("passes on aligned locales", async () => {
    const root = await makeFixture(async (messagesRoot) => {
      await createLocale(messagesRoot, "en-US", "Save");
      await createLocale(messagesRoot, "nb-NO", "Lagre");
    });

    await expect(
      validateI18nMessages({ messagesRoot: root, supportedLocales: ["en-US", "nb-NO"], canonicalLocale: "en-US" })
    ).resolves.toBeUndefined();

    await rm(root, { recursive: true, force: true });
  });

  it("rejects html tags", async () => {
    const root = await makeFixture(async (messagesRoot) => {
      await createLocale(messagesRoot, "en-US", "<b>Save</b>");
      await createLocale(messagesRoot, "nb-NO", "Lagre");
    });

    await expect(
      validateI18nMessages({ messagesRoot: root, supportedLocales: ["en-US", "nb-NO"], canonicalLocale: "en-US" })
    ).rejects.toThrow("HTML tag detected");

    await rm(root, { recursive: true, force: true });
  });

  it("rejects empty values", async () => {
    const root = await makeFixture(async (messagesRoot) => {
      await createLocale(messagesRoot, "en-US", "");
      await createLocale(messagesRoot, "nb-NO", "Lagre");
    });

    await expect(
      validateI18nMessages({ messagesRoot: root, supportedLocales: ["en-US", "nb-NO"], canonicalLocale: "en-US" })
    ).rejects.toThrow("empty translation value");

    await rm(root, { recursive: true, force: true });
  });

  it("rejects key mismatch", async () => {
    const root = await makeFixture(async (messagesRoot) => {
      await createLocale(messagesRoot, "en-US", "Save");
      await createLocale(messagesRoot, "nb-NO", "Lagre", { cancel: "Avbryt" });
    });

    await expect(
      validateI18nMessages({ messagesRoot: root, supportedLocales: ["en-US", "nb-NO"], canonicalLocale: "en-US" })
    ).rejects.toThrow("key mismatch");

    await rm(root, { recursive: true, force: true });
  });
});
