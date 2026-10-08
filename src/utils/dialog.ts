// utils/dialog.ts — pengganti window.alert / window.confirm dgn modal bergaya web
// (header gradasi biru / merah utk aksi berbahaya). Satu <AppDialog> dipasang di App.vue.
//
//   if (!(await confirmDialog('Lepas relasi ini?', { danger: true }))) return;
//   alertDialog('Gagal menyimpan.', { tone: 'error' });
import { reactive } from 'vue';

export type DialogTone = 'info' | 'success' | 'warning' | 'error';

export interface DialogState {
  open: boolean;
  kind: 'alert' | 'confirm';
  title: string;
  message: string;
  tone: DialogTone;
  danger: boolean;
  confirmText: string;
  cancelText: string;
  resolve: ((ok: boolean) => void) | null;
}

export const dialogState = reactive<DialogState>({
  open: false, kind: 'alert', title: '', message: '', tone: 'info', danger: false,
  confirmText: 'OK', cancelText: 'Batal', resolve: null,
});

// Antrean: dialog baru menunggu dialog sebelumnya ditutup (tak saling timpa).
let chain: Promise<unknown> = Promise.resolve();

function show(kind: DialogState['kind'], message: string, opts: Partial<Omit<DialogState, 'open' | 'kind' | 'message' | 'resolve'>>) {
  const run = () => new Promise<boolean>((resolve) => {
    Object.assign(dialogState, {
      open: true, kind, message,
      title: opts.title ?? (kind === 'confirm' ? 'Konfirmasi' : opts.tone === 'error' ? 'Gagal' : opts.tone === 'success' ? 'Berhasil' : 'Informasi'),
      tone: opts.tone ?? (kind === 'confirm' ? (opts.danger ? 'warning' : 'info') : 'info'),
      danger: !!opts.danger,
      confirmText: opts.confirmText ?? (kind === 'confirm' ? 'Lanjutkan' : 'OK'),
      cancelText: opts.cancelText ?? 'Batal',
      resolve: (ok: boolean) => { dialogState.open = false; dialogState.resolve = null; resolve(ok); },
    });
  });
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  return p;
}

/** Konfirmasi (Promise<boolean>) — true bila user menekan tombol lanjut. */
export function confirmDialog(message: string, opts: { title?: string; danger?: boolean; confirmText?: string; cancelText?: string } = {}) {
  // Aksi merusak (hapus/lepas/nonaktif/cabut/lebur) → tombol merah otomatis.
  const danger = opts.danger ?? /hapus|lepas|nonaktif|cabut|lebur|putus/i.test(message);
  return show('confirm', message, { ...opts, danger });
}

/** Pemberitahuan. Pesan dgn kata "gagal"/"tidak bisa" otomatis bernada error. */
export function alertDialog(message: string, opts: { title?: string; tone?: DialogTone } = {}) {
  const tone = opts.tone ?? (/gagal|tidak bisa|error|tak ditemukan|tidak ditemukan/i.test(message) ? 'error' : 'info');
  return show('alert', message, { ...opts, tone }).then(() => undefined);
}
