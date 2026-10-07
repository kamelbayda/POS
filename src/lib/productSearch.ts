/** Lower case, and Arabic letters typed several ways made equal (أ/إ/آ → ا, ة → ه, ى → ي). */
const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

/** Till search: name, barcode, extra barcodes or IMEI, across every category. */
export function matchesProductSearch(
  p: { name: string; barcode: string; barcodes?: string[]; serialNumbers?: string[] },
  query: string,
): boolean {
  const q = norm(query.trim());
  if (!q) return true;
  const compact = q.replace(/[\s-]+/g, '');
  return norm(p.name).includes(q)
    || norm(p.barcode).includes(q)
    || (p.barcodes || []).some(b => norm(b).includes(q))
    || (p.serialNumbers || []).some(s => norm(s).includes(compact));
}
