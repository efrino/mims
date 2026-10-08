import { useStoTagListService } from '@/services/Admin/StoTagListService';
import { useStoTagOkCollector } from '@/services/Admin/StoTagOkCollector';
import type { StoReportRow } from '@/types/Admin/StoReport';
import type { StoTagListRow } from '@/types/Admin/StoTagList';

/**
 * Modul STO -- rekap per part untuk Report STO.
 *
 * Kedua sisinya dihitung dari daftar tag yang sebenarnya, bukan dari endpoint
 * `summary-*`. Rekap bawaan backend menyaring per RENTANG TANGGAL dan tidak
 * menerima `id_event`, sehingga tag milik event lain yang dibuat pada rentang
 * yang sama ikut terhitung -- angkanya lalu tidak cocok dengan yang dilihat
 * admin di layar.
 *
 *   Tag STO -> GET /tag-list, disaring `id_event`, diambil per 500 baris
 *              memakai `offset` sampai habis.
 *   Tag OK  -> lewat StoTagOkCollector, yang menyiasati batas 500 baris
 *              tanpa offset pada `tag-ok-list`.
 *
 * Tag yang dibatalkan disaring di backend lewat `batal: '0'`.
 */

/** Satu halaman tag-list saat mengumpulkan seluruh tag satu event. */
const HAL_LIMIT = 500;
const HAL_MAX = 60;

export const useStoReportService = () => {
  const tagService = useStoTagListService();
  const collector = useStoTagOkCollector();

  /** Kunci gabung: satu part yang sama di area berbeda tetap dua baris. */
  const kunci = (part: string, job: string, area: string): string => `${part}||${job}||${area}`;

  /** Seluruh tag STO milik satu event, dikumpulkan per halaman. */
  const ambilTagSto = async (nik: string, idEvent: number): Promise<StoTagListRow[]> => {
    const semua: StoTagListRow[] = [];

    for (let halaman = 0; halaman < HAL_MAX; halaman += 1) {
      const hasil = await tagService.fetchTags(nik, {
        q: '',
        area: '',
        id_event: idEvent,
        batal: '0',
        scan: '',
        limit: HAL_LIMIT,
        offset: halaman * HAL_LIMIT
      });

      const rows = (hasil.data ?? []) as StoTagListRow[];
      semua.push(...rows);

      if (rows.length < HAL_LIMIT || semua.length >= (hasil.total_semua ?? semua.length)) break;
    }

    return semua;
  };

  const buildReport = async (nik: string, idEvent: number): Promise<{ rows: StoReportRow[]; lengkap: boolean }> => {
    const [tagSto, tagOk] = await Promise.all([
      ambilTagSto(nik, idEvent),
      collector.kumpulkanSemua(nik, { q: '', area: '', open: '', batal: '0', id_event: idEvent, limit: HAL_LIMIT })
    ]);

    const baris = new Map<string, StoReportRow>();

    const ambil = (part: string, job: string, area: string): StoReportRow => {
      const k = kunci(part, job, area);
      let row = baris.get(k);

      if (!row) {
        row = {
          part_number: part,
          job_number: job,
          area,
          customer: '',
          plant: '',
          sloc: '',
          category: '',
          material_description: '',
          sto_total_tag: 0,
          sto_qty_a: 0,
          sto_qty_b: 0,
          sto_selisih: 0,
          ok_total_tag: 0,
          ok_total_qty: 0
        };
        baris.set(k, row);
      }

      return row;
    };

    for (const r of tagSto) {
      const row = ambil(r.part_number, r.job_number, r.area);
      // Nilai pertama yang tidak kosong yang dipakai. Sisi tag STO diproses
      // duluan, jadi customer dari master_data (mis. "ADM") menang atas versi
      // panjang milik tag OK (mis. "ADM Plant 5") bila part-nya punya keduanya.
      row.customer = row.customer || r.customer;
      // plant hanya ada di sisi tag STO -- tag_ok_data tidak menyimpannya.
      row.plant = row.plant || r.plant;
      row.sloc = row.sloc || r.sloc;
      row.category = row.category || r.category;
      row.material_description = row.material_description || r.material_description;
      row.sto_total_tag += 1;
      // `updated_a` / `updated_b` kosong berarti tim itu belum mengisi. qty-nya
      // sendiri NOT NULL DEFAULT 0, jadi tidak bisa membedakan belum discan
      // dari hasil nol.
      if (r.updated_a) row.sto_qty_a += r.qty_a ?? 0;
      if (r.updated_b) row.sto_qty_b += r.qty_b ?? 0;
    }

    for (const r of tagOk.rows) {
      const row = ambil(r.part_number, r.job_number, r.area);
      row.customer = row.customer || r.customer;
      row.ok_total_tag += 1;
      // qty_kbn, sama dengan kolom Qty KBN di layar. `qty_scan` sengaja tidak
      // dipakai supaya satu angka saja yang jadi acuan.
      row.ok_total_qty += Number(r.qty_kbn ?? 0);
    }

    const rows = [...baris.values()].map((r) => ({ ...r, sto_selisih: r.sto_qty_a - r.sto_qty_b }));

    rows.sort(
      (a, b) =>
        a.part_number.localeCompare(b.part_number) ||
        a.job_number.localeCompare(b.job_number) ||
        a.area.localeCompare(b.area)
    );

    return { rows, lengkap: tagOk.lengkap };
  };

  return { buildReport };
};
