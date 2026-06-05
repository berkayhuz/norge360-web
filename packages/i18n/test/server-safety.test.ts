import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["core", "messages", "format", "next"].map((segment) => path.resolve(process.cwd(), "src", segment));

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

describe("locale package server-safety", () => {
  it("core modules do not rely on browser-only globals", async () => {
    const patterns = ["window.", "document.", "localStorage", "sessionStorage", "navigator."];

    for (const root of roots) {
      const files = await walk(root);
      for (const file of files) {
        const content = await readFile(file, "utf8");
        for (const pattern of patterns) {
          expect(content.includes(pattern)).toBe(false);
        }
      }
    }
  });
});
