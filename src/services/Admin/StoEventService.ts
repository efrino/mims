import { readStoAdminNik, stoAxios, stoHandleError, useStoApiUrl } from '@/services/Admin/StoApi';
import type {
  StoEvent,
  StoEventListItem,
  StoEventFormData,
  StoEventDeleteResult,
  StoEventSaveResult
} from '@/types/Admin/StoEvent';

interface StoEventApiRow {
  id_event: number;
  event_name: string;
  start_date: string;
  end_date: string;
  status: number;
  allow_print?: number;
  total_tim?: number;
  tag_mode?: string;
  total_tag: number;
  // Opsional supaya baris dari backend lama (yang belum mengirim keduanya)
  // tetap terbaca, bukan jadi NaN.
  total_used?: number;
  total_cancelled?: number;
  created_at: string;
  updated_at: string;
}

interface StoEventListResponse {
  status: string;
  message: string;
  total_row: number;
  data: StoEventApiRow[];
}

/**
 * Modul STO -- CRUD events (majsf_sto.events).
 *
 *   GET  /event-list
 *   GET  /event-detail
 *   POST /event-create
 *   POST /event-update
 *   POST /event-delete
 */
export const useStoEventService = () => {
  const apiUrl = useStoApiUrl();

  /** Tanggal hari ini menurut jam mesin (bukan UTC). */
  const hariIni = (): string => {
    const d = new Date();
    const dua = (n: number) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
  };

  /**
   * Baris backend -> bentuk yang dipakai tabel.
   *
   * `total_used` (tag yang sudah discan tim A atau B) dan `total_cancelled`
   * (is_canceled = 1) dihitung event-list lewat agregat SQL; null hanya
   * dipakai bila backend belum mengirimnya, dan ditampilkan sebagai "-".
   */
  const toListItem = (row: StoEventApiRow): StoEventListItem => ({
    id_event: row.id_event,
    event_name: row.event_name,
    start_date: row.start_date,
    end_date: row.end_date === '' ? null : row.end_date,
    status: (row.status === 1 ? 1 : 0) as 0 | 1,
    // Bawaan backend: allow_print 1, total_tim 2. Dipakai juga sebagai
    // cadangan bila baris datang dari respons lama yang belum mengirimnya.
    allow_print: (Number(row.allow_print ?? 1) === 0 ? 0 : 1) as 0 | 1,
    total_tim: (Number(row.total_tim ?? 2) === 1 ? 1 : 2) as 1 | 2,
    // Backend lama belum mengirim tag_mode; 'both' adalah bawaan kolom dan
    // perilaku yang sudah berjalan, jadi aman dipakai sebagai cadangan.
    tag_mode: (['sto', 'ok', 'both'].includes(String(row.tag_mode)) ? String(row.tag_mode) : 'both') as StoEvent['tag_mode'],
    total_tag: row.total_tag ?? 0,
    total_used: row.total_used ?? null,
    total_cancelled: row.total_cancelled ?? null
  });

  const listEvents = async (params: { status?: 0 | 1; limit?: number } = {}): Promise<StoEventListItem[]> => {
    try {
      const response = await stoAxios.get<StoEventListResponse>(`${apiUrl}/event-list`, {
        params: {
          nik: readStoAdminNik(),
          status: params.status,
          limit: params.limit ?? 500
        }
      });
      return Array.isArray(response.data?.data) ? response.data.data.map(toListItem) : [];
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /** Event yang sedang berjalan -- baris pertama dari event-list berstatus 1. */
  const fetchCurrent = async (): Promise<StoEvent | null> => {
    const rows = await listEvents({ status: 1, limit: 1 });
    return rows[0] ?? null;
  };

  const fetchList = async (): Promise<StoEventListItem[]> => listEvents();

  const fetchDetail = async (idEvent: number): Promise<StoEvent> => {
    try {
      const response = await stoAxios.get<{ data: StoEventApiRow }>(`${apiUrl}/event-detail`, {
        params: { nik: readStoAdminNik(), id_event: idEvent }
      });
      return toListItem(response.data.data);
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  const createEvent = async (formData: StoEventFormData): Promise<StoEventSaveResult> => {
    try {
      const response = await stoAxios.post<StoEventSaveResult>(`${apiUrl}/event-create`, {
        nik: readStoAdminNik(),
        event_name: formData.event_name,
        // start_date wajib di backend; kalau form dikosongkan, pakai hari ini
        start_date: formData.start_date || hariIni(),
        allow_print: formData.allow_print,
        total_tim: formData.total_tim,
        tag_mode: formData.tag_mode
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /**
   * Partial update. `end_date` dikirim sebagai string kosong ketika form
   * mengosongkannya -- itulah cara backend melepas tanggal selesai (null
   * berarti "tidak dikirim", bukan "dikosongkan").
   */
  const updateEvent = async (idEvent: number, formData: Partial<StoEventFormData>): Promise<StoEventSaveResult> => {
    try {
      const payload: Record<string, unknown> = { nik: readStoAdminNik(), id_event: idEvent };
      if (formData.event_name !== undefined) payload.event_name = formData.event_name;
      if (formData.start_date !== undefined) payload.start_date = formData.start_date;
      if (formData.end_date !== undefined) payload.end_date = formData.end_date ?? '';
      if (formData.allow_print !== undefined) payload.allow_print = formData.allow_print;
      if (formData.total_tim !== undefined) payload.total_tim = formData.total_tim;
      if (formData.tag_mode !== undefined) payload.tag_mode = formData.tag_mode;

      const response = await stoAxios.post<StoEventSaveResult>(`${apiUrl}/event-update`, payload);
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  const kirimStatus = async (idEvent: number, payload: Record<string, unknown>): Promise<StoEventSaveResult> => {
    try {
      const response = await stoAxios.post<StoEventSaveResult>(`${apiUrl}/event-update`, {
        nik: readStoAdminNik(),
        id_event: idEvent,
        ...payload
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /** Tutup event: status jadi 0 dan tanggal selesai diisi hari ini. */
  const closeEvent = async (idEvent: number): Promise<StoEventSaveResult> =>
    kirimStatus(idEvent, { status: 0, end_date: hariIni() });

  /**
   * Aktifkan event. Hanya boleh ada satu event berjalan, sedangkan modul STO
   * membolehkan lebih dari satu (cuma memperingatkan) -- jadi event aktif
   * lainnya ditutup dulu di sini, lewat jalur tutup yang sama supaya
   * end_date-nya ikut terisi.
   */
  const activateEvent = async (idEvent: number): Promise<StoEventSaveResult> => {
    const aktif = await listEvents({ status: 1 });

    for (const event of aktif) {
      if (event.id_event !== idEvent) {
        await closeEvent(event.id_event);
      }
    }

    return kirimStatus(idEvent, { status: 1 });
  };

  /**
   * Tanpa `force`, backend membalas 200 dengan status "confirm" bila masih
   * ada tag yang menempel pada event -- bukan error. Pemanggil yang
   * memutuskan apakah dikirim ulang dengan force.
   */
  const deleteEvent = async (idEvent: number, force = false): Promise<StoEventDeleteResult> => {
    try {
      const response = await stoAxios.post<StoEventDeleteResult>(`${apiUrl}/event-delete`, {
        nik: readStoAdminNik(),
        id_event: idEvent,
        force
      });
      return response.data;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  return {
    fetchCurrent,
    fetchList,
    fetchDetail,
    createEvent,
    updateEvent,
    activateEvent,
    closeEvent,
    deleteEvent
  };
};
