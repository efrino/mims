import { stoAxios, stoHandleError, useStoApiUrl } from '@/services/Admin/StoApi';
import { useStoTagListService } from '@/services/Admin/StoTagListService';
import type { StoTagOkFilter, StoTagOkRow } from '@/types/Admin/StoTagList';
import type { StoSummaryTagOkPartResponse } from '@/types/Admin/StoReport';

/**
 * Mengumpulkan SELURUH tag OK yang cocok dengan sebuah filter.
 */

const LIMIT = 500;

/** Rentang peta -- selebar mungkin, lihat catatan di atas. */
const PETA_AWAL = '2000-01-01';
const PETA_AKHIR = '2999-12-31';

/** Permintaan yang jalan bersamaan. Cukup untuk cepat, tidak membanjiri backend. */
const PARALEL = 5;

export interface HasilKumpulTagOk {
  rows: StoTagOkRow[];
  lengkap: boolean;
  permintaan: number;
}

export const useStoTagOkCollector = () => {
  const apiUrl = useStoApiUrl();
  const tagService = useStoTagListService();

  /** Peta nama area -> part number di dalamnya, bahan untuk membelah. */
  const ambilPeta = async (): Promise<Map<string, Set<string>>> => {
    try {
      const response = await stoAxios.get<StoSummaryTagOkPartResponse>(`${apiUrl}/summary-tag-ok-part`, {
        params: { start_date: PETA_AWAL, end_date: PETA_AKHIR }
      });

      const peta = new Map<string, Set<string>>();

      for (const r of response.data?.data ?? []) {
        if (!peta.has(r.area)) peta.set(r.area, new Set());
        if (r.part_number) peta.get(r.area)?.add(r.part_number);
      }

      return peta;
    } catch (error) {
      stoHandleError(error);
      throw error;
    }
  };

  /** Jalankan sekumpulan tugas beberapa sekaligus, bukan satu per satu. */
  const berbatch = async <T>(tugas: (() => Promise<T>)[]): Promise<T[]> => {
    const hasil: T[] = [];

    for (let i = 0; i < tugas.length; i += PARALEL) {
      hasil.push(...(await Promise.all(tugas.slice(i, i + PARALEL).map((t) => t()))));
    }

    return hasil;
  };

  const kumpulkanSemua = async (nik: string, filter: StoTagOkFilter): Promise<HasilKumpulTagOk> => {
    let permintaan = 0;
    let lengkap = true;

    const peta = await ambilPeta();

    const ambil = async (f: StoTagOkFilter): Promise<StoTagOkRow[]> => {
      permintaan += 1;
      const hasil = await tagService.fetchTagOk(nik, { ...f, limit: LIMIT });

      return (hasil.data ?? []) as StoTagOkRow[];
    };

    const kumpul = async (f: StoTagOkFilter): Promise<StoTagOkRow[]> => {
      const rows = await ambil(f);

      if (rows.length < LIMIT) return rows;

      if (!f.area) {
        // Nama area dari peta, ditambah yang muncul di potongan ini.
        const daftar = [...new Set([...peta.keys(), ...rows.map((r) => r.area).filter(Boolean)])];
        const bagian = await berbatch(daftar.map((area) => () => kumpul({ ...f, area })));

        return bagian.flat();
      }

      if (!f.open) {
        const bagian = await berbatch((['1', '0'] as const).map((open) => () => kumpul({ ...f, open })));

        return bagian.flat();
      }

      if (!f.q) {
        const daftar = [...new Set([...(peta.get(f.area) ?? []), ...rows.map((r) => r.part_number).filter(Boolean)])];

        if (daftar.length > 0) {
          const bagian = await berbatch(daftar.map((part) => () => kumpul({ ...f, q: part })));

          return bagian.flat();
        }
      }

      lengkap = false;

      return rows;
    };

    const semua = await kumpul(filter);

    // Potongan bisa tumpang tindih -- `q` mencocokkan sebagian teks, jadi satu
    // tag bisa terjaring dua part number berbeda.
    const unik = new Map<string, StoTagOkRow>();
    for (const r of semua) unik.set(r.id_tag_ok, r);

    const rows = [...unik.values()].sort((a, b) => b.id_tag_ok.localeCompare(a.id_tag_ok));

    return { rows, lengkap, permintaan };
  };

  return { kumpulkanSemua };
};
