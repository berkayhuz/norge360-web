export function formatDateTimeLabel(value: string | Date | null | undefined, locale?: string) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value.trim());
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (date.getUTCFullYear() <= 1) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatRelativeTimeLabel(value: string | Date | null | undefined, now = new Date()) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value.trim());
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (date.getUTCFullYear() <= 1) {
    return null;
  }

  const diffMs = Math.abs(date.getTime() - now.getTime());
  const units: Array<{ label: Intl.RelativeTimeFormatUnit; ms: number }> = [
    { label: "year", ms: 1000 * 60 * 60 * 24 * 365 },
    { label: "month", ms: 1000 * 60 * 60 * 24 * 30 },
    { label: "week", ms: 1000 * 60 * 60 * 24 * 7 },
    { label: "day", ms: 1000 * 60 * 60 * 24 },
    { label: "hour", ms: 1000 * 60 * 60 },
    { label: "minute", ms: 1000 * 60 },
    { label: "second", ms: 1000 },
  ];

  const unit = units.find((item) => diffMs >= item.ms) ?? units[units.length - 1];
  const rawValue = Math.max(1, Math.floor(diffMs / unit.ms));

  return `${rawValue}${getRelativeSuffix(unit.label)}`;
}

function getRelativeSuffix(unit: Intl.RelativeTimeFormatUnit) {
  switch (unit) {
    case "year":
    case "years":
      return "y";
    case "quarter":
    case "quarters":
      return "q";
    case "month":
    case "months":
      return "mo";
    case "week":
    case "weeks":
      return "w";
    case "day":
    case "days":
      return "d";
    case "hour":
    case "hours":
      return "h";
    case "minute":
    case "minutes":
      return "m";
    case "second":
    case "seconds":
      return "s";
    default:
      return "s";
  }
}
