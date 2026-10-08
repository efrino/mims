export const DATE_FILTER_SEARCH_HELPER =
  'Format pencarian: 2026-08-04 atau 2026-08';

/**
 * Kolom tanggal tidak selalu memakai nama key yang seragam antar tabel.
 * Selain key/label Date/Tanggal/Tgl, `penyerahan` adalah tanggal serah pada
 * tabel Tracking Sales Order.
 */
export const isDateFilterColumn = (
  key: string,
  label: string
): boolean => {
  const normalizedKey = String(key ?? '').trim().toLowerCase();
  const normalizedLabel = String(label ?? '')
    .replace(/\n/g, ' ')
    .trim()
    .toLowerCase();

  return (
    normalizedKey.includes('date') ||
    normalizedKey.includes('tanggal') ||
    normalizedKey === 'penyerahan' ||
    /\b(date|tanggal|tgl)\b/.test(normalizedLabel)
  );
};
