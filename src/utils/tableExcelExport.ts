export const achievementRowKey = (row: Record<string, unknown>): string =>
  ['date', 'shift', 'line_id', 'urut'].map((k) => String(row[k] ?? '')).join('|');

export function downloadFilteredReport(url: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.target = '_blank';
  form.style.display = 'none';

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
}
