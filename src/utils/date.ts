export function buildCalendarWeeks(year: number, month: number) {
  const weeks: any[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();

  let start = 1;
  let week = 1;

  while (start <= lastDay) {
    const end = Math.min(start + 6, lastDay);

    weeks.push({
      id: week,
      label: `W${week}`,
      start,
      end,
    });

    start = end + 1;
    week++;
  }

  return weeks;
}