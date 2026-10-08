export interface ChatConversation {
  id: number | string;
  title: string;
  date?: string;
}

export interface ChatMessage {
  id: number | string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  /** Tanggal lokal pesan dalam format YYYY-MM-DD untuk pemisah hari. */
  date?: string;
  dataframe?: unknown;
}

export interface AIChatRequest {
  session_id: string;
  message: string;
  topic: string;
}

export type AIChatStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'dataframe'; data: unknown }
  | { type: 'status'; content: string };
