import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageJsonPath = path.resolve(process.cwd(), "package.json");

describe("locale package exports", () => {
  it("defines expected public subpath exports", async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      exports?: Record<string, unknown>;
    };

    expect(packageJson.exports).toBeDefined();
    expect(packageJson.exports).toHaveProperty(".");
    expect(packageJson.exports).toHaveProperty("./core");
    expect(packageJson.exports).toHaveProperty("./messages");
    expect(packageJson.exports).toHaveProperty("./format");
    expect(packageJson.exports).toHaveProperty("./next");
    expect(packageJson.exports).toHaveProperty("./testing");
  });

  it("keeps testing helpers out of the runtime root export", async () => {
    const localeRoot = await import("../src");
    expect("resolveLocaleForTest" in localeRoot).toBe(false);
  });
});
