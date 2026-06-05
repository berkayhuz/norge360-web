import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(process.cwd(), "src");

const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) return [fullPath];
      return [];
    })
  );

  return nested.flat();
};

describe("locale package boundaries", () => {
  it("does not import @norge360/design", async () => {
    const files = await walk(srcRoot);

    for (const file of files) {
      const content = await readFile(file, "utf8");
      expect(content.includes("@norge360/design")).toBe(false);
    }
  });
});
