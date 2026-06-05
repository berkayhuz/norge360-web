import { describe, expect, it } from "vitest";

import daDK from "../../../../../../packages/i18n/messages/da-DK/public-web.json";
import deDE from "../../../../../../packages/i18n/messages/de-DE/public-web.json";
import enUS from "../../../../../../packages/i18n/messages/en-US/public-web.json";
import nbNO from "../../../../../../packages/i18n/messages/nb-NO/public-web.json";
import svSE from "../../../../../../packages/i18n/messages/sv-SE/public-web.json";

const locales = { daDK, deDE, enUS, nbNO, svSE };
const requiredKeys = [
  "community.feed.emptyTitle",
  "community.feed.emptyDescription",
  "community.post.maxImagesError",
  "community.post.edit",
  "community.post.editTitle",
  "community.post.saveChanges",
  "community.post.delete",
  "community.post.deleteTitle",
  "community.post.deleteConfirm",
  "community.comment.title",
  "community.reaction.add",
  "community.report.submit",
  "community.moderation.reports",
  "community.moderation.hide",
  "community.moderation.restore",
];

describe("community locale contracts", () => {
  it.each(Object.entries(locales))("%s contains required community translations", (_, messages) => {
    for (const key of requiredKeys) {
      expect(readPath(messages, key), `${key} should be translated`).toBeTypeOf("string");
      expect(readPath(messages, key), `${key} should not be blank`).not.toBe("");
    }
  });
});

function readPath(value: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}
