export function filterItems<T extends Record<string, any>>(
  items: T[],
  filters: Record<string, string>
): T[] {
  return items.filter((item) => {
    return Object.keys(filters).every((key) => {
      const filterValue = filters[key];

      // Jika filter kosong => lolos
      if (!filterValue || filterValue.length < 1) return true;

      const fieldValue = item[key];

      // Jika field tidak ada => otomatis tidak cocok
      if (fieldValue == null) return false;

      return String(fieldValue).toLowerCase().includes(filterValue.toLowerCase());
    });
  });
}
