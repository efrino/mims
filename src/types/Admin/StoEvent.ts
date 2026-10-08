/**
 * Satuan hitung yang dipakai sebuah event.
 *
 *   'sto'  hanya tag STO; seluruh alur tag OK ditutup backend.
 *   'ok'   hanya tag OK; pencetakan tag STO ditutup backend.
 *   'both' keduanya dipakai -- bawaan kolom, dan perilaku sebelum kolom ini ada.
 */
export type StoTagMode = 'sto' | 'ok' | 'both';

export interface StoEvent {
  id_event: number;
  event_name: string;
  start_date: string;
  end_date: string | null;
  status: 0 | 1;
  /** 1 = tag boleh dicetak, 0 = pencetakan ditutup admin. Terpisah dari `status`. */
  allow_print: 0 | 1;
  /** 1 = satu tim (scan mengisi qty tim A dan B sekaligus), 2 = dua tim terpisah. */
  total_tim: 1 | 2;
  tag_mode: StoTagMode;
}

export interface StoEventListItem extends StoEvent {
  total_tag: number;
  total_used: number | null;
  total_cancelled: number | null;
  [key: string]: unknown;
}

/** Balasan event-create / event-update. */
export interface StoEventSaveResult {
  status: string;
  message: string;
  diubah?: string[];
  warnings?: string[];
  data?: StoEvent | null;
}

/**
 * Balasan event-delete. Tanpa `force`, backend membalas status "confirm"
 * beserta jumlah tag yang masih menempel -- penghapusan belum dijalankan.
 */
export interface StoEventDeleteResult {
  status: 'success' | 'confirm' | 'failed';
  message: string;
  id_event?: number;
  total_tag?: number;
  tag_dilepas?: number;
}

export interface StoEventFormData {
  event_name: string;
  start_date: string;
  end_date: string | null;
  allow_print: 0 | 1;
  total_tim: 1 | 2;
  tag_mode: StoTagMode;
}

export interface StoEventDialog {
  form: boolean;
  delete: boolean;
  activate: boolean;
  close: boolean;
  /** Konfirmasi sebelum membuat event baru -- hak akses operator ikut dikosongkan. */
  resetOperator: boolean;
}

export interface StoEventDeleteData {
  id_event: number | null;
  event_name: string;
}

export interface StoEventState {
  /** NIK yang dipakai header "Diakses sebagai". */
  nik: string;
  /** Tombol Logout pada "Diakses sebagai" sedang memproses. */
  isLoggingOut: boolean;
  dataTable: StoEventListItem[];
  currentEvent: StoEvent | null;
  formData: StoEventFormData;
  dialog: StoEventDialog;
  action: 'Create' | 'Edit';
  editId: number | null;
  deleteData: StoEventDeleteData;
  actionTarget: StoEventListItem | null;
  isDeleting: boolean;
  isSaving: boolean;
  isActivating: boolean;
  isClosing: boolean;
  /**
   * Status event yang sedang diedit. Dipakai mengunci pilihan izin cetak --
   * pencetakan hanya masuk akal pada event yang berjalan.
   */
  editStatus: 0 | 1;
  permissions: {
    create: boolean;
    update: boolean;
  };
}
