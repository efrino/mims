import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ref } from 'vue';

/**
 * Modul STO (majsf_sto) -- dipakai bersama seluruh halaman Admin > STO.
 */
export const STO_API_HOST = 'http://192.168.10.55';

export const STO_API_BASE_URL = import.meta.env.DEV ? '/sto-v2' : `${STO_API_HOST}/sto-v2`;

export const useStoApiUrl = (): string => STO_API_BASE_URL;

/**
 * Backend selalu membalas {status, message} dan menambahkan array `errors`
 * pada kegagalan validasi. Keduanya digabung jadi satu pesan supaya alasan
 * penolakan tidak hilang di layar.
 */
export const stoHandleError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: string[] } | undefined;
    const detail = Array.isArray(data?.errors) && data.errors.length > 0 ? ` (${data.errors.join('; ')})` : '';
    throw new Error(`${data?.message || error.message || 'Terjadi kesalahan pada server'}${detail}`);
  }
  // Mis. admin menutup modal PIN -- pesannya sudah jelas, jangan diganti pesan umum.
  if (error instanceof Error) throw error;
  throw new Error('Terjadi kesalahan yang tidak diketahui');
};

// ── PIN & token admin ──────────────────────────────────────────────────
//
// Admin STO yang sudah menyetel PIN wajib membawa token sesi (Authorization:
// Bearer) di setiap endpoint admin. Token didapat dari POST /login dengan
// `pin`, berumur 12 jam sejak diterbitkan, dan satu NIK hanya punya satu
// token hidup -- login di tempat lain mencabut token di sini.
//
// Karena itu seluruh pemanggilan STO memakai instance axios sendiri:
//  - interceptor global dashboard (main.ts) memasang token LOGIN DASHBOARD ke
//    setiap permintaan axios bawaan. Token itu tidak berarti apa-apa bagi
//    backend STO, dan tidak boleh bocor ke host lain;
//  - balasan 401 yang meminta PIN/token ditangani di satu tempat: modal PIN
//    dibuka, lalu permintaan yang gagal diulang sekali dengan token baru.

/** Umur token menurut backend, dikurangi sedikit supaya tidak dipakai di detik terakhir. */
const UMUR_TOKEN_MS = 12 * 60 * 60 * 1000 - 5 * 60 * 1000;

const kunciToken = (nik: string) => `sto_admin_token:${nik.trim().toUpperCase()}`;

export const readStoToken = (nik: string): string | null => {
  try {
    const raw = localStorage.getItem(kunciToken(nik));
    if (!raw) return null;

    const simpan = JSON.parse(raw) as { token?: string; expiresAt?: number };
    if (!simpan.token || !simpan.expiresAt || simpan.expiresAt <= Date.now()) {
      localStorage.removeItem(kunciToken(nik));
      return null;
    }

    return simpan.token;
  } catch {
    return null;
  }
};

const saveStoToken = (nik: string, token: string): void => {
  localStorage.setItem(kunciToken(nik), JSON.stringify({ token, expiresAt: Date.now() + UMUR_TOKEN_MS }));
};

export const clearStoToken = (nik: string): void => localStorage.removeItem(kunciToken(nik));

/**
 * Login admin dengan PIN. Sengaja lewat axios polos, bukan stoAxios --
 * kalau PIN-nya salah, balasan 401 itu tidak boleh memicu modal PIN lagi.
 */
export const loginStoDenganPin = async (nik: string, pin: string): Promise<void> => {
  try {
    const response = await axios.create().post<{ data?: { token?: string } }>(`${STO_API_BASE_URL}/login`, { nik, pin });
    const token = response.data?.data?.token;

    if (token) {
      saveStoToken(nik, token);
    } else {
      // Akun tanpa PIN tidak diberi token; tidak ada yang perlu disimpan.
      clearStoToken(nik);
    }
  } catch (error) {
    stoHandleError(error);
  }
};

/**
 * Keadaan token sebuah NIK menurut GET /token-check -- endpoint khusus untuk
 * ini, ditambahkan 2026-09-14. Dipakai baik untuk pemeriksaan awal (modal PIN
 * dibuka) maupun pemeriksaan berkala tiap 15 detik selagi menu STO terbuka:
 *   valid: true          -- token lokal masih diakui server, tidak perlu PIN.
 *   pinBelumDiatur: true -- akun belum pernah menyetel PIN, harus set dulu.
 *   pinDiperlukan: true  -- ber-PIN tapi token kosong / tidak cocok / kedaluwarsa.
 * NIK yang tidak terdaftar atau bukan admin dilempar sebagai error biasa.
 */
export type StoTokenStatus =
  | { valid: true; expiresAt: string }
  | { valid: false; pinBelumDiatur: true }
  | { valid: false; pinDiperlukan: true; alasan: string };

export const cekTokenSto = async (nik: string): Promise<StoTokenStatus> => {
  const token = readStoToken(nik);

  try {
    const response = await axios.create().get<{
      pin_belum_diatur?: number;
      expires_at?: string;
    }>(`${STO_API_BASE_URL}/token-check`, {
      params: { nik },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });

    if (Number(response.data?.pin_belum_diatur) === 1) return { valid: false, pinBelumDiatur: true };

    return { valid: true, expiresAt: response.data?.expires_at ?? '' };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const data = error.response.data as { pin_diperlukan?: number; alasan?: string } | undefined;
      if (Number(data?.pin_diperlukan) === 1) return { valid: false, pinDiperlukan: true, alasan: data?.alasan ?? '' };
    }

    // Non-admin dibalas 403 di sini, bukan 400 seperti /login tanpa android_id.
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error(`NIK "${nik}" bukan akun admin STO. Menu STO hanya bisa dibuka NIK ber-role admin.`);
    }

    return stoHandleError(error);
  }
};

/**
 * Setel PIN pertama kali (tanpa pinLama) atau ganti PIN (dengan pinLama).
 * Backend membalas token baru dan mencabut yang lama, jadi tokennya langsung disimpan.
 */
export const setPinSto = async (nik: string, pinBaru: string, pinLama?: string): Promise<void> => {
  try {
    const response = await axios.create().post<{ token?: string }>(`${STO_API_BASE_URL}/pin-set`, {
      nik,
      pin_baru: pinBaru,
      pin_lama: pinLama || undefined
    });

    if (response.data?.token) {
      saveStoToken(nik, response.data.token);
    }
  } catch (error) {
    stoHandleError(error);
  }
};

/**
 * POST /logout -- mencabut token sesi di server. Token yang sudah tidak
 * cocok (login di tempat lain, atau memang sudah logout) dibalas 200 tanpa
 * menyentuh database -- bukan error, jadi tidak ada yang perlu ditangani
 * khusus di sini selain token lokal yang tetap dibuang oleh pemanggil.
 */
export const logoutStoSesi = async (nik: string): Promise<void> => {
  const token = readStoToken(nik);
  if (!token) return; // tidak ada token lokal -- tidak ada sesi untuk dicabut

  await axios.create().post(`${STO_API_BASE_URL}/logout`, { nik }, { headers: { Authorization: `Bearer ${token}` } });
};

type PenanyaPin = (nik: string) => Promise<void>;

let penanyaPin: PenanyaPin | null = null;

/** Didaftarkan modal PIN saat terpasang. Tanpa modal, 401 diteruskan apa adanya. */
export const setStoPinHandler = (fn: PenanyaPin | null): void => {
  penanyaPin = fn;
};

/**
 * Permintaan yang jalan bersamaan (mis. Promise.all di halaman) bisa sama-sama
 * kena 401. Semuanya menunggu satu modal yang sama, bukan membuka modal
 * bertumpuk.
 */
const menungguPin = new Map<string, Promise<void>>();

/**
 * Buka modal PIN untuk sebuah NIK. `paksa` membuang token yang masih hidup
 * dulu, sehingga PIN tetap harus dimasukkan walau sesinya belum habis.
 */
export const mintaPinSto = (nik: string, opsi: { paksa?: boolean } = {}): Promise<void> => {
  const kunci = nik.trim().toUpperCase();
  const ada = menungguPin.get(kunci);
  if (ada) return ada;

  if (opsi.paksa) clearStoToken(nik);

  if (!penanyaPin) return Promise.reject(new Error('Sesi admin STO berakhir. Muat ulang halaman lalu masukkan PIN.'));

  const janji = penanyaPin(nik).finally(() => menungguPin.delete(kunci));
  menungguPin.set(kunci, janji);

  return janji;
};

const mintaPin = (nik: string): Promise<void> => mintaPinSto(nik);

/**
 * Ganti NIK admin STO. NIK baru selalu diminta PIN lagi -- atau disuruh
 * menyetel PIN dulu bila belum punya -- dan baru disimpan setelah berhasil.
 * Kalau modal dibatalkan, NIK lama tetap dipakai.
 */
export const gantiNikSto = async (nik: string): Promise<void> => {
  await mintaPinSto(nik, { paksa: true });
  saveStoAdminNik(nik);
};

type PenanyaNik = () => Promise<void>;

let penanyaNik: PenanyaNik | null = null;

/** Didaftarkan modal PIN saat terpasang -- lihat setStoPinHandler. */
export const setStoNikHandler = (fn: PenanyaNik | null): void => {
  penanyaNik = fn;
};

let janjiPilihNik: Promise<void> | null = null;

/**
 * Buka modal pilih-NIK saat masuk submenu Admin > STO tanpa sesi sama sekali.
 * Beda dari mintaPinSto: NIK-nya belum diketahui, diketik sendiri oleh pemakai
 * (tidak ada bawaan, tidak ada daftar tersimpan). Modal itu sendiri yang
 * menyimpan NIK yang diketik (saveStoAdminNik) begitu PIN-nya benar.
 *
 * Bisa dibatalkan lewat tombol X -- janji-nya ditolak, dan action fetch yang
 * menunggunya berhenti tanpa data (pemakai bebas pindah ke menu lain).
 */
export const pilihNikSto = (): Promise<void> => {
  if (janjiPilihNik) return janjiPilihNik;
  if (!penanyaNik) return Promise.reject(new Error('Sesi admin STO berakhir. Muat ulang halaman lalu pilih NIK.'));

  janjiPilihNik = penanyaNik().finally(() => {
    janjiPilihNik = null;
  });

  return janjiPilihNik;
};

/**
 * Pastikan ada NIK admin aktif sebelum memanggil endpoint STO, menunggu
 * modal pilih-NIK dulu kalau belum ada (localStorage kosong -- perangkat
 * baru, atau baru dibersihkan). readStoAdminNik() sendiri tidak lagi punya
 * bawaan, jadi tanpa ini action fetch yang jalan di onMounted bisa balapan
 * dengan gerbang rute dan berakhir memanggil backend dengan nik="" (dibalas
 * 400, bukan 401 -- interceptor stoAxios tidak menganggapnya perlu PIN).
 * Dipakai action fetch utama tiap halaman submenu STO.
 */
export const pastikanNikSto = async (): Promise<string> => {
  const ada = readStoAdminNik();
  if (ada) return ada;

  await pilihNikSto();
  return readStoAdminNik();
};

/**
 * Keluar dari sesi STO NIK ini -- dipakai tombol Logout di header submenu.
 * Mencabut token di server (kegagalannya diabaikan; lihat catatan di
 * logoutStoSesi), membuang token lokal, lalu langsung membuka modal
 * pilih-NIK supaya sesi berikutnya -- NIK yang sama atau yang lain -- selalu
 * lewat PIN lagi.
 */
export const keluarDariStoSesi = async (nik: string): Promise<void> => {
  try {
    await logoutStoSesi(nik);
  } catch {
    // Gagal jaringan/server -- token lokal tetap dibuang di bawah, jadi
    // efeknya sama saja dari sisi pemakai: diminta PIN lagi.
  }

  clearStoToken(nik);
  clearStoAdminNik();
  await pilihNikSto();
};

/** NIK yang dipakai sebuah permintaan: query `nik`, body `nik`, atau `created_by` pada register. */
const nikDariPermintaan = (config: InternalAxiosRequestConfig): string => {
  const params = (config.params ?? {}) as Record<string, unknown>;
  let body: Record<string, unknown> = {};

  if (typeof config.data === 'string') {
    try {
      body = JSON.parse(config.data) as Record<string, unknown>;
    } catch {
      body = {};
    }
  } else if (config.data && typeof config.data === 'object') {
    body = config.data as Record<string, unknown>;
  }

  return String(params.nik ?? body.created_by ?? body.nik ?? readStoAdminNik()).trim();
};

type ConfigSto = InternalAxiosRequestConfig & { _stoDiulang?: boolean };

export const stoAxios = axios.create();

stoAxios.interceptors.request.use((config) => {
  const token = readStoToken(nikDariPermintaan(config));

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

stoAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ token_diperlukan?: number; pin_diperlukan?: number }>) => {
    const config = error.config as ConfigSto | undefined;
    const data = error.response?.data;
    const butuhSesi = error.response?.status === 401 && (Number(data?.token_diperlukan) === 1 || Number(data?.pin_diperlukan) === 1);

    if (!config || !butuhSesi || config._stoDiulang) {
      return Promise.reject(error);
    }

    const nik = nikDariPermintaan(config);

    // Sesi tidak lagi sah: buang token DAN NIK aktif. NIK disimpan lagi oleh
    // modal PIN begitu PIN-nya benar, jadi retry di bawah tetap dapat NIK-nya
    // (lewat param permintaan asli), sementara refresh sebelum PIN dimasukkan
    // tidak menyisakan `sto_admin_nik` mati.
    clearStoToken(nik);
    clearStoAdminNik();
    await mintaPin(nik);

    config._stoDiulang = true;

    return stoAxios(config);
  }
);

/**
 * NIK admin yang jadi gerbang endpoint STO.
 *
 * Akun STO ada di majsf_sto.users, terpisah dari user dashboard -- jadi
 * dipakai NIK admin bawaan, bukan username yang sedang login. Bisa diganti
 * dari halaman dan tersimpan di localStorage, dipakai bersama oleh seluruh
 * halaman Admin > STO.
 */
export const STO_ADMIN_NIK_KEY = 'sto_admin_nik';

// Sengaja tidak ada bawaan -- NIK admin harus benar-benar dipilih pemakai
// lewat modal pilih-NIK, bukan diam-diam jatuh ke satu akun tertentu. Tanpa
// ini, "" yang dibalas tetap aman: readStoToken("") tidak pernah menemukan
// token, jadi gerbangSto tetap membuka modal seperti seharusnya.
export const readStoAdminNik = (): string => localStorage.getItem(STO_ADMIN_NIK_KEY) || '';

/**
 * NIK admin STO yang sesinya SEDANG sah (PIN sudah terverifikasi), sebagai
 * sumber reaktif tunggal untuk tampilan. Kosong berarti belum masuk / sudah
 * logout / sesi tidak sah -- header submenu memakainya untuk menyembunyikan
 * NIK, bukan `store.nik` yang bisa tertinggal berisi NIK lama. Selalu bergerak
 * bersama `sto_admin_nik`: keduanya ditulis dan dihapus di pasangan fungsi ini.
 */
export const stoNikAktif = ref(readStoAdminNik());

export const saveStoAdminNik = (nik: string): void => {
  localStorage.setItem(STO_ADMIN_NIK_KEY, nik);
  stoNikAktif.value = nik;
};

/**
 * Buang NIK admin aktif dari localStorage. Dipanggil setiap kali sesi STO
 * berakhir atau tidak sah: logout, token dicabut/kedaluwarsa (401), atau
 * pemeriksaan token gagal. Dengan begitu `sto_admin_nik` hanya ada selama
 * benar-benar ada NIK yang PIN-nya sudah pernah diverifikasi -- masuk lagi ke
 * submenu STO selalu mulai dari langkah ketik-NIK, bukan diam-diam memakai NIK
 * lama yang sesinya sudah mati.
 */
export const clearStoAdminNik = (): void => {
  localStorage.removeItem(STO_ADMIN_NIK_KEY);
  stoNikAktif.value = '';
};
