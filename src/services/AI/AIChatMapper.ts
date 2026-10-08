import type { ChatConversation, ChatMessage } from '@/types/AI/AIChat';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function findArray(value: unknown, keys: string[], depth = 0): unknown[] {
  if (Array.isArray(value)) return value;
  if (depth > 3) return [];

  const record = asRecord(value);
  if (!record) return [];

  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }

  for (const key of ['data', 'result', 'payload']) {
    if (record[key] && typeof record[key] === 'object') {
      const nested = findArray(record[key], keys, depth + 1);
      if (nested.length) return nested;
    }
  }

  return [];
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

function formatHistoryDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractDataframeArtifact(artifacts: unknown): unknown {
  const candidates = Array.isArray(artifacts) ? artifacts : [artifacts];

  for (const candidate of candidates) {
    const artifact = asRecord(candidate);
    if (!artifact) continue;

    const type = firstString(artifact, ['type', 'kind', 'name'])?.toLowerCase() ?? '';
    const payload = artifact.dataframe ?? artifact.table ?? artifact.data ?? artifact.payload ?? artifact.content ?? artifact.value;

    if (artifact.dataframe !== undefined || artifact.table !== undefined) {
      return artifact.dataframe ?? artifact.table;
    }

    if (type.includes('dataframe') || type.includes('table')) {
      return payload ?? artifact;
    }

    const payloadRecord = asRecord(payload);
    if (payloadRecord?.raw_data_for_ui !== undefined) {
      return payloadRecord.raw_data_for_ui;
    }

    if (payloadRecord && ['details', 'columns', 'rows', 'records'].some((key) => Array.isArray(payloadRecord[key]))) {
      return payload;
    }

    // Accept a dataframe directly in artifacts (e.g. { details: [...] } or { columns, rows }).
    if (['details', 'columns', 'rows', 'records'].some((key) => Array.isArray(artifact[key]))) {
      return candidate;
    }
  }

  return undefined;
}

/** Translate the backend session response to the chat history view model. */
export function normalizeAIChatSessions(response: unknown): ChatConversation[] {
  return findArray(response, ['sessions', 'items', 'results', 'data']).reduce<ChatConversation[]>((sessions, value) => {
    const record = asRecord(value);
    const id = typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : record ? firstString(record, ['session_id', 'sessionId', 'id']) : undefined;
    if (!id) return sessions;

    const title = record ? firstString(record, ['title', 'name', 'subject', 'label']) : undefined;
    const date = record ? firstString(record, ['updated_at', 'last_message_at', 'created_at', 'date']) : undefined;
    sessions.push({ id, title: title ?? `Percakapan ${id.slice(0, 8)}`, date: formatHistoryDate(date) });
    return sessions;
  }, []);
}

/** Translate the backend message response to messages displayed by the chat. */
export function normalizeAIChatMessages(response: unknown, sessionId: string): ChatMessage[] {
  return findArray(response, ['messages', 'history', 'items', 'results', 'data']).reduce<ChatMessage[]>((messages, value, index) => {
    const record = asRecord(value);
    if (!record) return messages;

    const rawRole = firstString(record, ['role', 'sender', 'author', 'type'])?.toLowerCase();
    const role: ChatMessage['role'] = ['user', 'human'].includes(rawRole ?? '') ? 'user' : 'assistant';
    const textValue = record.text ?? record.content ?? record.message ?? record.prompt ?? record.answer;
    const text = typeof textValue === 'string'
      ? textValue
      : textValue == null ? '' : JSON.stringify(textValue);
    const rawTime = firstString(record, ['time', 'created_at', 'timestamp', 'date']);
    const parsedDate = rawTime ? new Date(rawTime) : null;
    const messageDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
    const dataframe = record.dataframe
      ?? (record.type === 'dataframe' ? record.data : undefined)
      ?? extractDataframeArtifact(record.artifacts);

    messages.push({
      id: firstString(record, ['message_id', 'id']) ?? `${sessionId}-${index}`,
      role,
      text,
      time: messageDate
        ? messageDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '',
      ...(messageDate ? { date: formatDateKey(messageDate) } : {}),
      ...(dataframe !== undefined ? { dataframe } : {})
    });
    return messages;
  }, []);
}
