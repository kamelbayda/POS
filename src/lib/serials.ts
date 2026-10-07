/** IMEI / serial number helpers for phone shops. */

/** Trims and drops spaces/dashes so a scanned or typed IMEI compares equal. */
export const normalizeSerial = (s: string) => s.replace(/[\s-]+/g, '').toUpperCase();

/** One serial per line (or comma/space separated), normalised, empties and repeats removed. */
export function parseSerialList(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const s = normalizeSerial(raw);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

/** Date `months` months after `isoDate` (YYYY-MM-DD). */
export function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
