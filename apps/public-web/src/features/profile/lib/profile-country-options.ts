export type ProfileSelectOption = Readonly<{
  label: string;
  value: string;
}>;

const FALLBACK_REGION_CODES = ["NO", "SE", "DK", "FI", "IS", "DE", "GB", "US", "FR", "NL", "PL", "TR"];

export function buildCountryOptions(locale: string, currentValue?: string | null): readonly ProfileSelectOption[] {
  const displayNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames([locale], { type: "region" })
    : null;

  const regionCodes = getRegionCodes();
  const options = regionCodes
    .map((code) => {
      const label = displayNames?.of(code) ?? code;
      return { label, value: label } satisfies ProfileSelectOption;
    })
    .filter((option, index, array) => array.findIndex((item) => item.value === option.value) === index)
    .sort((left, right) => left.label.localeCompare(right.label, locale));

  const normalizedCurrent = currentValue?.trim();
  if (normalizedCurrent && !options.some((option) => option.value === normalizedCurrent)) {
    options.unshift({ label: normalizedCurrent, value: normalizedCurrent });
  }

  return options;
}

function getRegionCodes() {
  try {
    const supportedValuesOf = Intl.supportedValuesOf as unknown as ((key: string) => string[]) | undefined;
    const supported = typeof supportedValuesOf === "function" ? supportedValuesOf("region") : [];
    if (supported.length > 0) {
      return supported;
    }
  } catch {
    // Fallback below.
  }

  return FALLBACK_REGION_CODES;
}
