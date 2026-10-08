import { useAuthStore } from '@/stores/auth';
import { useConfigStore } from '@/stores/config';
import type { AIChatRequest, AIChatStreamEvent } from '@/types/AI/AIChat';

export type { AIChatRequest, AIChatStreamEvent } from '@/types/AI/AIChat';

function getAIChatApiBaseUrl(): string {
  const { apiUrl } = useConfigStore();
  const apiBaseUrl = apiUrl.startsWith('http') ? apiUrl.replace(/\/$/, '') : `http://${apiUrl}`;

  return `${apiBaseUrl}/majsf_rest_api/api/ai/ai_chat`;
}

function getAuthToken(): string {
  const { token } = useAuthStore();
  if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');
  return token;
}

async function fetchAIChatJson(path: string): Promise<unknown> {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${getAIChatApiBaseUrl()}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server untuk memuat riwayat. Periksa koneksi lalu coba lagi.');
  }

  const body = await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(getHttpErrorMessage(response.status, 'memuat riwayat'));
  }

  if (!body.trim()) return [];

  if (body.trimStart().startsWith('<')) {
    throw new Error('Server mengirim halaman error, bukan data riwayat. Coba lagi beberapa saat.');
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Respons riwayat dari server tidak dapat dibaca. Coba lagi beberapa saat.');
  }
}

async function mutateAIChatSession(path: string, method: 'PATCH' | 'DELETE', body?: unknown): Promise<void> {
  const token = getAuthToken();
  let response: Response;

  try {
    response = await fetch(`${getAIChatApiBaseUrl()}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server untuk mengubah percakapan. Periksa koneksi lalu coba lagi.');
  }

  if (response.ok) return;
  throw new Error(getHttpErrorMessage(response.status, 'mengubah percakapan'));
}

function getHttpErrorMessage(
  status: number,
  action: 'memuat riwayat' | 'mengirim pesan' | 'mengubah percakapan'
): string {
  switch (status) {
    case 401:
      return 'Sesi login tidak valid atau sudah berakhir. Silakan login kembali.';
    case 403:
      return action === 'memuat riwayat'
        ? 'Anda tidak memiliki akses untuk melihat riwayat percakapan ini.'
        : action === 'mengubah percakapan'
          ? 'Anda tidak memiliki akses untuk mengubah percakapan ini.'
          : 'Anda tidak memiliki akses untuk menggunakan Chat AI.';
    case 404:
      return action === 'memuat riwayat'
        ? 'Riwayat percakapan tidak ditemukan.'
        : action === 'mengubah percakapan'
          ? 'Percakapan tidak ditemukan atau sudah dihapus.'
          : 'Endpoint Chat AI tidak ditemukan. Periksa konfigurasi rute backend.';
    case 502:
    case 503:
      return `Layanan AI sedang tidak tersedia saat ${action}. Coba lagi beberapa saat.`;
    case 504:
      return `Server terlalu lama merespons saat ${action}. Coba lagi.`;
    default:
      return status >= 500
        ? `Terjadi gangguan pada server saat ${action}. Coba lagi beberapa saat.`
        : action === 'memuat riwayat'
          ? 'Riwayat percakapan gagal dimuat. Coba lagi.'
          : action === 'mengubah percakapan'
            ? 'Perubahan percakapan gagal disimpan. Coba lagi.'
            : 'Pesan gagal diproses. Silakan coba lagi.';
  }
}

/** Ambil daftar sesi milik user yang sedang login. */
export function fetchAIChatSessions(): Promise<unknown> {
  return fetchAIChatJson('/sessions');
}

/** Ambil seluruh pesan dari sesi yang dipilih. */
export function fetchAIChatMessages(sessionId: string): Promise<unknown> {
  return fetchAIChatJson(`/sessions/${encodeURIComponent(sessionId)}/messages`);
}

/** Ubah judul percakapan pada server. */
export function updateAIChatSessionTitle(sessionId: string, title: string): Promise<void> {
  return mutateAIChatSession(`/sessions/${encodeURIComponent(sessionId)}`, 'PATCH', { title });
}

/** Hapus percakapan dan pesannya pada server. */
export function deleteAIChatSession(sessionId: string): Promise<void> {
  return mutateAIChatSession(`/sessions/${encodeURIComponent(sessionId)}/messages`, 'DELETE');
}

function getChatStreamUrl(): string {
  return `${getAIChatApiBaseUrl()}/chat/stream`;
}

/**
 * Kirim pesan ke server AI dan baca respons JSON Lines secara bertahap.
 * Pemanggil dapat menghentikan request dengan memberikan AbortSignal.
 */
export async function* streamAIChat(payload: AIChatRequest, signal?: AbortSignal): AsyncGenerator<AIChatStreamEvent> {
  const token = getAuthToken();

  let response: Response;
  try {
    response = await fetch(getChatStreamUrl(), {
      method: 'POST',
      headers: {
        Accept: 'application/x-ndjson, application/json',
        App: 'mims',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server Chat AI. Periksa koneksi lalu coba lagi.');
  }

  if (!response.ok) {
    throw new Error(getHttpErrorMessage(response.status, 'mengirim pesan'));
  }

  if (response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
    throw new Error('Server Chat AI mengirim halaman error, bukan jawaban. Coba lagi beberapa saat.');
  }

  if (!response.body) {
    throw new Error('Server Chat AI tidak mengirim aliran jawaban. Coba lagi.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        const event = parseStreamLine(line);
        if (event) yield event;

        newlineIndex = buffer.indexOf('\n');
      }
    }

    const finalEvent = parseStreamLine(buffer.trim());
    if (finalEvent) yield finalEvent;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Format respons Chat AI')) {
      throw new Error('Terjadi kesalahan dengan layanan AI. Coba lagi atau hubungi admin.');
    }
    if (error instanceof Error && error.message.startsWith('AI mengalami kendala')) throw error;
    throw new Error('Koneksi Chat AI terputus sebelum jawaban selesai. Silakan coba lagi.');
  } finally {
    // Menutup koneksi jika pemanggil berhenti membaca sebelum stream selesai.
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function parseStreamLine(line: string): AIChatStreamEvent | null {
  if (!line) return null;

  let data: unknown;
  try {
    data = JSON.parse(line);
  } catch {
    throw new Error('Format respons Chat AI tidak valid.');
  }

  if (!data || typeof data !== 'object' || !('type' in data)) {
    throw new Error('Format respons Chat AI tidak memiliki jenis event.');
  }

  const event = data as Record<string, unknown>;

  switch (event.type) {
    case 'text':
      if (typeof event.content !== 'string') {
        throw new Error('Format respons Chat AI pada event text tidak valid.');
      }
      return { type: 'text', content: event.content };
    case 'status':
      if (typeof event.content !== 'string') {
        throw new Error('Format respons Chat AI pada event status tidak valid.');
      }
      return { type: 'status', content: event.content };
    case 'dataframe':
      return { type: 'dataframe', data: event.data };
    case 'error':
      throw new Error('AI mengalami kendala saat menyusun jawaban. Silakan coba lagi.');
    default:
      // Abaikan event tambahan yang belum digunakan oleh UI, misalnya event keep-alive.
      return null;
  }
}
