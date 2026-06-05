import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  assertSupportedLocale,
  getDefaultLocale,
  getFallbackLocale,
  getLocaleMetadata,
  getSupportedLocales,
  isSupportedLocale,
  normalizeLocale,
  resolveLocale
} from "../src/core";

describe("locale core", () => {
  it("validates supported locales", () => {
    expect(isSupportedLocale("nb-NO")).toBe(true);
    expect(isSupportedLocale("nb-no")).toBe(true);
    expect(isSupportedLocale("../../etc/passwd")).toBe(false);
  });

  it("normalizes locale", () => {
    expect(normalizeLocale("en-us")).toBe("en-US");
    expect(normalizeLocale("foo")).toBeNull();
  });

  it("resolves locale safely", () => {
    expect(resolveLocale("de-de")).toBe("de-DE");
    expect(resolveLocale("bad-locale", FALLBACK_LOCALE)).toBe("en-US");
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it("asserts locale", () => {
    expect(() => assertSupportedLocale("sv-SE")).not.toThrow();
    expect(() => assertSupportedLocale("x")).toThrow("Unsupported locale");
  });

  it("returns metadata and getters", () => {
    expect(getSupportedLocales()).toContain("da-DK");
    expect(getDefaultLocale()).toBe("nb-NO");
    expect(getFallbackLocale()).toBe("en-US");
    expect(getLocaleMetadata("en-US").direction).toBe("ltr");
    expect(getLocaleMetadata("en-US").language).toBe("English");
  });
});
