<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  cekTokenSto,
  clearStoAdminNik,
  clearStoToken,
  loginStoDenganPin,
  mintaPinSto,
  pilihNikSto,
  readStoAdminNik,
  readStoToken,
  saveStoAdminNik,
  setPinSto,
  setStoNikHandler,
  setStoPinHandler
} from '@/services/Admin/StoApi';

/**
 * Modal NIK + PIN admin STO -- dipasang sekali di App.vue.
 *
 * Dibuka dari empat jalan:
 *  - membuka submenu Admin > STO tanpa sesi sama sekali -- mulai dari
 *    pemilihan NIK (dropdown, khusus NIK ber-role admin), bukan langsung PIN;
 *  - mengganti NIK di halaman STO (gantiNikSto memaksa PIN lagi untuk NIK itu,
 *    NIK-nya sudah diketahui jadi langsung ke PIN, tanpa dropdown);
 *  - backend membalas 401 karena token habis atau dicabut (stoAxios);
 *  - pemeriksaan berkala tiap 15 detik selagi menu STO terbuka (lihat
 *    periksaTokenBerkala) mendapati token sudah tidak sah lagi di server,
 *    mis. NIK yang sama login di tempat lain.
 *
 * Isinya ditentukan keadaan token NIK itu di backend (GET /token-check): NIK
 * yang belum punya PIN wajib menyetelnya dulu, yang sudah punya diminta PIN
 * dan boleh menggantinya dari sini.
 *
 * Modal bisa ditutup lewat tombol X kapan saja -- janji-nya ditolak, dan
 * action fetch yang menunggunya berhenti tanpa data. Pemakai lalu bebas
 * pindah ke menu lain; halaman STO-nya sekadar kosong sampai PIN dimasukkan.
 * Tombol "Ganti NIK" pada langkah PIN/setPin/gantiPin/gagal membawa balik ke
 * langkah ketik-NIK.
 *
 * NIK admin diketik sendiri pemakai -- tidak ada bawaan, tidak ada daftar
 * tersimpan. Placeholdernya cuma contoh bentuk (A.xxxx).
 */

type Mode = 'pilihNik' | 'memeriksa' | 'pin' | 'setPin' | 'gantiPin' | 'gagal';

const terbuka = ref(false);
const mode = ref<Mode>('memeriksa');
const nik = ref('');
const nikPilihan = ref('');
const pin = ref('');
const pinBaru = ref('');
const pinUlang = ref('');
const pesanError = ref('');
const isSubmitting = ref(false);
const formEl = ref<HTMLFormElement | null>(null);

let selesai: (() => void) | null = null;
let batal: ((alasan: Error) => void) | null = null;

const POLA_PIN = /^[0-9]{4,8}$/;

const JUDUL: Record<Mode, string> = {
  pilihNik: 'Masukkan NIK Admin STO',
  memeriksa: 'Memeriksa Akun',
  pin: 'PIN Admin STO',
  setPin: 'Buat PIN Dulu',
  gantiPin: 'Ganti PIN',
  gagal: 'Akun Tidak Bisa Dipakai'
};

const judul = computed(() => JUDUL[mode.value]);

const kelasInput =
  'block w-full rounded-lg bg-gray-50 !border !border-gray-300 p-3 text-center text-2xl tracking-[0.5em] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400';

// Input NIK -- ukuran biasa, beda dari kelasInput (PIN) yang sengaja besar.
const kelasNik =
  'block w-full rounded-lg bg-gray-50 !border !border-gray-300 h-10 px-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400';

function kosongkanIsian() {
  pin.value = '';
  pinBaru.value = '';
  pinUlang.value = '';
  pesanError.value = '';
}

function fokus() {
  void nextTick(() => formEl.value?.querySelector<HTMLElement>('input')?.focus());
}

/**
 * Menutup modal dan meloloskan sesi -- dipanggil begitu token sudah sah
 * (token lama masih hidup, atau PIN baru saja diverifikasi). Baru di sinilah
 * `sto_admin_nik` disimpan: kunci itu hanya boleh ada untuk NIK yang PIN-nya
 * sudah terbukti benar, tidak sejak NIK diketik di langkah "Lanjut".
 */
function selesaikan() {
  saveStoAdminNik(nik.value);
  terbuka.value = false;
  kosongkanIsian();
  selesai?.();
}

async function periksa() {
  mode.value = 'memeriksa';
  kosongkanIsian();

  try {
    const status = await cekTokenSto(nik.value);

    if (status.valid) {
      // NIK yang dipilih kebetulan masih punya sesi sah -- tidak perlu PIN lagi.
      selesaikan();
      return;
    }

    mode.value = 'pinBelumDiatur' in status ? 'setPin' : 'pin';
    fokus();
  } catch (error) {
    // Pemeriksaan token gagal (mis. NIK bukan admin) -- sesi tidak sah, jadi
    // NIK aktif dibuang. Pemakai harus mengetik NIK lagi lewat "Ganti NIK".
    clearStoAdminNik();
    mode.value = 'gagal';
    pesanError.value = error instanceof Error ? error.message : 'Gagal memeriksa akun';
  }
}

/** Dipanggil mintaPinSto -- NIK-nya sudah pasti, langsung periksa token/PIN. */
function buka(nikDiminta: string): Promise<void> {
  // Dropdown pilih-NIK sedang menunggu pilihan -- ini cuma permintaan lain
  // yang ikut kena 401 di saat yang sama dengan gerbang rute (mis. halaman
  // langsung memuat data begitu mount, sebelum pemakai sempat memilih NIK).
  // Jangan menimpanya dengan langkah PIN untuk NIK lama; tunggu saja
  // pilihannya selesai -- permintaan yang gagal tadi diulang sendiri oleh
  // interceptor-nya.
  if (mode.value === 'pilihNik' && janjiPickerAktif) {
    return janjiPickerAktif;
  }

  nik.value = nikDiminta;
  mode.value = 'memeriksa';
  terbuka.value = true;
  void periksa();

  return new Promise<void>((resolve, reject) => {
    selesai = resolve;
    batal = reject;
  });
}

/**
 * Modal pilih-NIK yang sedang menunggu pilihan, kalau ada. Dicek dari buka()
 * supaya permintaan lain yang ikut kena 401 di saat yang sama dengan gerbang
 * rute tidak menimpa langkah pilih-NIK dengan langkah PIN untuk NIK lama --
 * lihat komentar di buka().
 */
let janjiPickerAktif: Promise<void> | null = null;

/** Dipanggil pilihNikSto -- belum ada NIK, minta pemakai mengetiknya dulu. */
function bukaPilihNik(): Promise<void> {
  nikPilihan.value = '';
  mode.value = 'pilihNik';
  terbuka.value = true;
  kosongkanIsian();
  fokus();

  const janji = new Promise<void>((resolve, reject) => {
    selesai = resolve;
    batal = reject;
  });

  janjiPickerAktif = janji.finally(() => {
    janjiPickerAktif = null;
  });

  return janjiPickerAktif;
}

function lanjutDenganNik() {
  const dipilih = nikPilihan.value.trim();
  if (!dipilih) return;

  // Belum disimpan di sini -- NIK baru ditulis ke localStorage oleh selesaikan()
  // setelah token/PIN-nya terbukti sah, bukan sejak diketik.
  nik.value = dipilih;
  void periksa();
}

/** Tautan "Ganti NIK" pada langkah PIN/setPin/gantiPin/gagal -- balik ke ketik-NIK. */
function gantiNikDariModal() {
  nikPilihan.value = '';
  mode.value = 'pilihNik';
  kosongkanIsian();
  fokus();
}

function validasi(): string {
  if (mode.value === 'pin') {
    return POLA_PIN.test(pin.value) ? '' : 'PIN harus 4-8 digit angka.';
  }
  if (mode.value === 'gantiPin' && !POLA_PIN.test(pin.value)) return 'PIN lama harus 4-8 digit angka.';
  if (!POLA_PIN.test(pinBaru.value)) return 'PIN baru harus 4-8 digit angka.';
  if (pinBaru.value !== pinUlang.value) return 'Ulangan PIN baru tidak sama.';
  if (mode.value === 'gantiPin' && pinBaru.value === pin.value) return 'PIN baru sama dengan PIN lama.';

  return '';
}

async function kirim() {
  pesanError.value = validasi();
  if (pesanError.value) return;

  try {
    isSubmitting.value = true;

    if (mode.value === 'pin') {
      await loginStoDenganPin(nik.value, pin.value);
    } else if (mode.value === 'setPin') {
      await setPinSto(nik.value, pinBaru.value);
    } else {
      await setPinSto(nik.value, pinBaru.value, pin.value);
    }

    selesaikan();
  } catch (error) {
    pesanError.value = error instanceof Error ? error.message : 'Gagal memproses PIN';
    pin.value = '';
    fokus();
  } finally {
    isSubmitting.value = false;
  }
}

function pindahMode(berikut: 'pin' | 'gantiPin') {
  mode.value = berikut;
  kosongkanIsian();
  fokus();
}

/**
 * Tombol X -- tutup modal tanpa menyelesaikan autentikasi. Janji-nya ditolak,
 * jadi action fetch yang menunggu berhenti tanpa data; pemakai bebas pindah ke
 * menu lain lewat sidebar. Halaman STO-nya sekadar kosong sampai PIN dimasukkan.
 */
function tutup() {
  terbuka.value = false;
  kosongkanIsian();
  batal?.(new Error('PIN admin STO belum dimasukkan.'));
}

// Hanya angka, maksimal 8 digit -- sama dengan aturan backend.
function angka(e: Event): string {
  const el = e.target as HTMLInputElement;
  el.value = el.value.replace(/\D/g, '').slice(0, 8);
  return el.value;
}

// ── Gerbang submenu STO ─────────────────────────────────────────────────
//
// Masuk ke submenu Admin > STO tanpa token hidup untuk NIK yang dipakai
// memunculkan modal ketik-NIK dulu. Kalau ditutup lewat X, pemakai TETAP di
// halaman itu -- halamannya sekadar kosong (fetch-nya berhenti tanpa data),
// dan pemakai bebas pindah ke menu lain lewat sidebar.
const route = useRoute();

async function gerbangSto(path: string) {
  if (!path.startsWith('/admin/sto-event')) return;

  const nikAktif = readStoAdminNik();
  if (readStoToken(nikAktif)) return;

  try {
    await pilihNikSto();
  } catch {
    // Ditutup lewat X -- tidak apa-apa, biarkan di halaman ini tanpa data.
  }
}

// ── Pemeriksaan token berkala (tiap 15 detik) ───────────────────────────
//
// Sama seperti halaman /prep: token bisa dicabut server tanpa sepengetahuan
// tab ini (mis. NIK yang sama login di tempat lain), jadi umur token lokal
// saja tidak cukup. Gagal jaringan / 500 sengaja diabaikan, dicoba lagi 15
// detik berikutnya -- itu bukan tanda token tidak sah.
async function periksaTokenBerkala() {
  if (!route.path.startsWith('/admin/sto-event')) return;
  if (terbuka.value) return; // modal lain sedang tampil, jangan menumpuk pemeriksaan

  const nikAktif = readStoAdminNik();
  if (!readStoToken(nikAktif)) return; // tidak ada sesi lokal -- biar gerbang rute yang menangani

  try {
    const status = await cekTokenSto(nikAktif);
    if (status.valid) return;

    // Sesi dicabut server -- buang token DAN NIK aktif. Modal PIN menyimpannya
    // lagi begitu PIN benar; ditutup lewat X, `sto_admin_nik` tetap kosong.
    clearStoToken(nikAktif);
    clearStoAdminNik();
    try {
      await mintaPinSto(nikAktif);
    } catch {
      // Ditutup lewat X -- biarkan di halaman ini tanpa data.
    }
  } catch {
    // Diabaikan dengan sengaja -- lihat komentar di atas fungsi ini.
  }
}

let timerToken: ReturnType<typeof setInterval> | null = null;

watch(() => route.path, gerbangSto);

onMounted(() => {
  setStoPinHandler(buka);
  setStoNikHandler(bukaPilihNik);
  // Dijalankan setelah handler terdaftar, supaya muat langsung ke halaman STO
  // (mis. refresh) juga kena gerbang.
  void gerbangSto(route.path);
  timerToken = setInterval(() => void periksaTokenBerkala(), 15000);
});

onBeforeUnmount(() => {
  setStoPinHandler(null);
  setStoNikHandler(null);
  if (timerToken) clearInterval(timerToken);
  // Modal ini dipasang sekali di App.vue dan seharusnya tidak pernah lepas
  // selagi aplikasi jalan -- tapi kalau suatu saat memang lepas selagi masih
  // menunggu (mis. hot-reload saat dev), pemanggil yang menunggu jangan
  // digantung selamanya.
  batal?.(new Error('Modal PIN admin STO tidak lagi terpasang.'));
});
</script>

<template>
  <Teleport to="body">
    <div v-if="terbuka" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <form
        ref="formEl"
        class="relative w-full max-w-sm rounded-xl bg-white shadow-2xl !border !border-gray-300"
        @submit.prevent="mode === 'pilihNik' ? lanjutDenganNik() : kirim()"
      >
        <button
          type="button"
          title="Tutup"
          :disabled="isSubmitting"
          class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="tutup"
        >
          <i class="mdi mdi-close text-xl" />
        </button>

        <div class="p-6">
          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            :class="mode === 'gagal' ? 'bg-red-100' : mode === 'setPin' ? 'bg-amber-100' : 'bg-blue-100'"
          >
            <i v-if="mode === 'pilihNik'" class="mdi mdi-account-outline text-4xl text-blue-600" />
            <i v-else-if="mode === 'memeriksa'" class="mdi mdi-loading mdi-spin text-4xl text-blue-600" />
            <i v-else-if="mode === 'gagal'" class="mdi mdi-account-alert-outline text-4xl text-red-600" />
            <i v-else-if="mode === 'setPin'" class="mdi mdi-shield-plus-outline text-4xl text-amber-600" />
            <i v-else class="mdi mdi-shield-key-outline text-4xl text-blue-600" />
          </div>

          <h3 class="mb-1 text-center text-xl font-bold text-gray-800">{{ judul }}</h3>

          <p class="mb-5 text-center text-sm text-gray-500">
            <template v-if="mode === 'pilihNik'">Masukkan NIK admin yang akan dipakai untuk membuka menu STO.</template>
            <template v-else>
              NIK <span class="font-semibold text-gray-800">{{ nik }}</span>
              <template v-if="mode === 'pin'">. Masukkan PIN untuk membuka menu STO.</template>
              <template v-else-if="mode === 'setPin'"> belum punya PIN. Buat PIN 4-8 digit dulu sebelum memakai menu STO.</template>
              <template v-else-if="mode === 'gantiPin'">. Masukkan PIN lama, lalu PIN baru dua kali.</template>
            </template>
          </p>

          <div v-if="mode === 'pilihNik'" class="mb-3">
            <label class="mb-1 block text-xs font-medium text-gray-600">NIK Admin</label>
            <input
              v-model.trim="nikPilihan"
              type="text"
              maxlength="50"
              placeholder="A.xxxx"
              autocomplete="off"
              :class="kelasNik"
            />
          </div>

          <div v-if="mode === 'pin' || mode === 'gantiPin'" class="mb-3">
            <label class="mb-1 block text-xs font-medium text-gray-600">{{ mode === 'gantiPin' ? 'PIN lama' : 'PIN' }}</label>
            <input
              :value="pin"
              type="password"
              inputmode="numeric"
              autocomplete="off"
              maxlength="8"
              placeholder="••••"
              :class="kelasInput"
              @input="pin = angka($event)"
            />
          </div>

          <template v-if="mode === 'setPin' || mode === 'gantiPin'">
            <div class="mb-3">
              <label class="mb-1 block text-xs font-medium text-gray-600">PIN baru</label>
              <input
                :value="pinBaru"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                maxlength="8"
                placeholder="••••"
                :class="kelasInput"
                @input="pinBaru = angka($event)"
              />
            </div>
            <div class="mb-3">
              <label class="mb-1 block text-xs font-medium text-gray-600">Ulangi PIN baru</label>
              <input
                :value="pinUlang"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                maxlength="8"
                placeholder="••••"
                :class="kelasInput"
                @input="pinUlang = angka($event)"
              />
            </div>
          </template>

          <p v-if="pesanError" class="mt-2 text-center text-sm text-red-600">{{ pesanError }}</p>

          <div class="mt-6 flex justify-center gap-3">
            <button
              v-if="mode === 'pilihNik'"
              type="submit"
              :disabled="!nikPilihan.trim()"
              class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lanjut
            </button>
            <button
              v-if="mode === 'pin' || mode === 'setPin' || mode === 'gantiPin'"
              type="submit"
              :disabled="isSubmitting"
              class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isSubmitting ? 'Memproses...' : mode === 'pin' ? 'Masuk' : 'Simpan PIN' }}
            </button>
            <button
              v-if="mode === 'gagal'"
              type="button"
              class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              @click="periksa"
            >
              Coba Lagi
            </button>
            <button
              v-if="mode === 'pin' || mode === 'setPin' || mode === 'gantiPin' || mode === 'gagal'"
              type="button"
              :disabled="isSubmitting"
              class="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-gray-500 !border !border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              @click="gantiNikDariModal"
            >
              Ganti NIK
            </button>
          </div>

          <div v-if="mode === 'pin' || mode === 'gantiPin'" class="mt-4 text-center text-xs">
            <button v-if="mode === 'pin'" type="button" class="font-medium text-blue-600 hover:underline" @click="pindahMode('gantiPin')">
              Ganti PIN
            </button>
            <button v-else type="button" class="font-medium text-blue-600 hover:underline" @click="pindahMode('pin')">
              Kembali ke masukkan PIN
            </button>
          </div>
        </div>
      </form>
    </div>
  </Teleport>
</template>
