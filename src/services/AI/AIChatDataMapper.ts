export interface AIChatDataTable {
  columns: string[];
  rows: unknown[][];
}

/** Convert supported AI dataframe payloads into a consistent table shape. */
export function normalizeAIChatDataframe(input: unknown): AIChatDataTable | null {
  let data = input;

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  if (Array.isArray(data)) {
    if (data.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
      return recordsToTable(data as Record<string, unknown>[]);
    }

    if (data.every((row) => Array.isArray(row))) {
      const rows = data as unknown[][];
      const width = Math.max(0, ...rows.map((row) => row.length));
      return { columns: Array.from({ length: width }, (_, index) => `Kolom ${index + 1}`), rows };
    }

    return null;
  }

  if (!data || typeof data !== 'object') return null;

  const source = data as Record<string, unknown>;
  if (source.raw_data_for_ui !== undefined) return normalizeAIChatDataframe(source.raw_data_for_ui);
  if (Array.isArray(source.details)) return normalizeAIChatDataframe(source.details);

  const sourceColumns = Array.isArray(source.columns)
    ? source.columns.map(normalizeColumnName)
    : Array.isArray(source.headers)
      ? source.headers.map(normalizeColumnName)
      : undefined;
  const sourceRows = source.data ?? source.rows ?? source.records ?? source.items;

  if (sourceRows && typeof sourceRows === 'object' && !Array.isArray(sourceRows)) {
    const nestedTable = normalizeAIChatDataframe(sourceRows);
    if (nestedTable) return nestedTable;
  }

  if (Array.isArray(sourceRows)) {
    if (sourceRows.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
      return recordsToTable(sourceRows as Record<string, unknown>[], sourceColumns);
    }

    if (sourceRows.every((row) => Array.isArray(row))) {
      const rows = sourceRows as unknown[][];
      const width = Math.max(sourceColumns?.length ?? 0, ...rows.map((row) => row.length));
      return {
        columns: sourceColumns ?? Array.from({ length: width }, (_, index) => `Kolom ${index + 1}`),
        rows
      };
    }
  }

  const entries = Object.entries(source);
  if (entries.length > 0 && entries.every(([, values]) => Array.isArray(values))) {
    const columns = entries.map(([column]) => column);
    const columnValues = entries.map(([, values]) => values as unknown[]);
    const rowCount = Math.max(0, ...columnValues.map((values) => values.length));
    return {
      columns,
      rows: Array.from({ length: rowCount }, (_, rowIndex) => columnValues.map((values) => values[rowIndex]))
    };
  }

  if (entries.length > 0 && entries.every(([, values]) => values && typeof values === 'object' && !Array.isArray(values))) {
    const columns = entries.map(([column]) => column);
    const columnValues = entries.map(([, values]) => values as Record<string, unknown>);
    const indexes = Array.from(new Set(columnValues.flatMap((values) => Object.keys(values))));
    return {
      columns,
      rows: indexes.map((index) => columnValues.map((values) => values[index]))
    };
  }

  return null;
}

function normalizeColumnName(column: unknown, index: number): string {
  if (typeof column === 'string' || typeof column === 'number') return String(column);
  if (column && typeof column === 'object') {
    const definition = column as Record<string, unknown>;
    const label = definition.name ?? definition.label ?? definition.field ?? definition.key;
    if (typeof label === 'string' || typeof label === 'number') return String(label);
  }
  return `Kolom ${index + 1}`;
}

function recordsToTable(records: Record<string, unknown>[], preferredColumns?: string[]): AIChatDataTable {
  const columns = preferredColumns ?? Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  return { columns, rows: records.map((record) => columns.map((column) => record[column])) };
}
