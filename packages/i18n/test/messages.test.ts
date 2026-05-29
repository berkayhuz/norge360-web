import { describe, expect, it } from "vitest";
import { loadMessages, loadMessagesWithFallback } from "../src/messages";

describe("messages", () => {
  it("loads namespace messages", async () => {
    const messages = await loadMessages("en-US");
    expect(messages.common.save).toBe("Save");
    expect(messages["data-table"].rowsPerPage).toContain("Rows");
  });

  it("keeps fallback path usable", async () => {
    const messages = await loadMessagesWithFallback("nb-NO");
    expect(messages.actions.submit.length).toBeGreaterThan(0);
  });

  it("rejects unsupported locale runtime inputs", async () => {
    await expect(loadMessages("../../etc/passwd" as never)).rejects.toThrow();
  });
});
