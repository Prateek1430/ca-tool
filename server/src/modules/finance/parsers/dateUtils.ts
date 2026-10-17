const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parses the handful of date formats Indian bank/UPI CSV exports actually use:
 * DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, and "DD MMM YYYY". Returns null (never
 * throws) so callers can flag the row as a warning instead of aborting the
 * whole import on one bad date.
 */
export function parseFlexibleDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  let m = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return isValidDate(+y, +mo - 1, +d) ? new Date(Date.UTC(+y, +mo - 1, +d)) : null;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  m = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return isValidDate(+y, +mo - 1, +d) ? new Date(Date.UTC(+y, +mo - 1, +d)) : null;
  }

  // DD-MM-YY or DD/MM/YY (2-digit year)
  m = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (m) {
    const [, d, mo, yShort] = m;
    const y = 2000 + +yShort;
    return isValidDate(y, +mo - 1, +d) ? new Date(Date.UTC(y, +mo - 1, +d)) : null;
  }

  // "DD MMM YYYY" e.g. "05 Jan 2026"
  m = value.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (m) {
    const [, d, monRaw, y] = m;
    const mo = MONTHS[monRaw.slice(0, 3).toLowerCase()];
    if (mo === undefined) return null;
    return isValidDate(+y, mo, +d) ? new Date(Date.UTC(+y, mo, +d)) : null;
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function isValidDate(year: number, monthIndex: number, day: number): boolean {
  if (year < 1970 || year > 2100) return false;
  if (monthIndex < 0 || monthIndex > 11) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, monthIndex, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === monthIndex && d.getUTCDate() === day;
}

export function parseFlexibleAmount(raw: string): number | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = raw.replace(/[,₹\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (cleaned === "" || cleaned === "-") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
