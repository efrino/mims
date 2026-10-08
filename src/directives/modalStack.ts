import type { Directive } from 'vue';

// v-modal-stack — urutan tumpuk modal = urutan DIBUKA, bukan urutan di template,
// plus tombol Esc yang selalu menutup modal PALING ATAS.
//
// 1) z-index: semua overlay di-Teleport ke <body> sesuai urutan TEMPLATE SOURCE,
//    jadi dgn z-index sama, modal yg dibuka belakangan bisa ke-render DI BAWAH modal
//    yg letaknya lebih akhir di template. Directive ini memberi z-index berurutan
//    sesuai waktu mount: yg terakhir dibuka selalu paling atas.
//    Rentang 99990..99996: di atas konten halaman, di bawah lightbox media (100000).
//
// 2) Esc: nilai directive = fungsi tutup modal itu, mis.
//      v-modal-stack="() => (myModal.open = false)"
//    Esc (walau sedang mengetik) memanggil fungsi tutup modal teratas saja, lalu
//    menghentikan event — handler Esc halaman tidak ikut menutup modal lain.
//    Fungsi tutup boleh menolak (mis. sedang menyimpan) — cukup tidak menutup.
//    Klik di luar modal SENGAJA tidak menutup (pakai @click.self.prevent di overlay):
//    input yg sedang diisi tidak hilang gara-gara salah klik.
type CloseFn = (() => unknown) | undefined;
interface StackEl extends HTMLElement { __msClose?: CloseFn }

const BASE_Z = 99990;
const MAX_Z = 99996;

const stack: StackEl[] = [];

function restack() {
  stack.forEach((el, i) => { el.style.zIndex = String(Math.min(BASE_Z + i, MAX_Z)); });
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !stack.length) return;
  const top = stack[stack.length - 1];
  if (typeof top.__msClose !== 'function') return;   // modal tanpa fungsi tutup → biar halaman yg menangani
  e.preventDefault();
  e.stopImmediatePropagation();
  top.__msClose();
}

export const vModalStack: Directive<StackEl, CloseFn> = {
  mounted(el, binding) {
    el.__msClose = binding.value;
    if (!stack.length) window.addEventListener('keydown', onKeydown, true);   // capture: lebih dulu dari handler halaman
    stack.push(el);
    restack();
  },
  updated(el, binding) {
    el.__msClose = binding.value;
  },
  beforeUnmount(el) {
    const i = stack.indexOf(el);
    if (i !== -1) stack.splice(i, 1);
    restack();
    if (!stack.length) window.removeEventListener('keydown', onKeydown, true);
  },
};
