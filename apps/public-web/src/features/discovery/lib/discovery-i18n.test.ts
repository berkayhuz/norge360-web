import { describe, expect, it } from "vitest";

import daDK from "../../../../../../packages/i18n/messages/da-DK/public-web.json";
import deDE from "../../../../../../packages/i18n/messages/de-DE/public-web.json";
import enUS from "../../../../../../packages/i18n/messages/en-US/public-web.json";
import nbNO from "../../../../../../packages/i18n/messages/nb-NO/public-web.json";
import svSE from "../../../../../../packages/i18n/messages/sv-SE/public-web.json";

const locales = { daDK, deDE, enUS, nbNO, svSE };
const requiredKeys = [
  "discovery.page.title",
  "discovery.page.description",
  "discovery.sections.popular",
  "discovery.sections.trending",
  "discovery.sections.suggested",
  "discovery.actions.follow",
  "discovery.actions.viewMore",
  "discovery.errors.loadFailed",
];

describe("discovery locale contracts", () => {
  it.each(Object.entries(locales))("%s contains required discovery translations", (_, messages) => {
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
