import { describe, expect, it } from "vitest";
import { createNextIntlRequestConfig } from "../src/next";

describe("next helpers", () => {
  it("resolves and loads messages", async () => {
    const config = await createNextIntlRequestConfig("en-us");
    expect(config.locale).toBe("en-US");
    expect(config.messages.common.save).toBe("Save");
  });

  it("guards invalid inputs", async () => {
    const config = await createNextIntlRequestConfig("../../etc/passwd");
    expect(config.locale).toBe("nb-NO");
  });
});
