# PRD/SRS — Report Stamping Stock (Stock Andon Press)

| Field | Value |
|---|---|
| Route | `/report/stamping/stock` |
| Component | `src/views/admin/Stamping/Report/Stock/StockPage.vue` |
| Store | `src/stores/Stamping/Report/Stock.ts` (`useReportStockStore`) |
| Service | `src/services/Stamping/Report/StockService.ts` |
| Types | `src/types/Stamping/Report/reportStock.ts` |
| Module | Stamping — Report |
| Owner | TBD |
| Status | Draft (disusun dari kode berjalan) |
| Versi | v1.0 |
| Tanggal | 2026-07-08 |

## 1. Ringkasan & Tujuan
Halaman ini menampilkan laporan stock harian produk stamping dalam 3 tampilan (tab): **Stock Blank**, **Stock IFP**, dan **Achievement PCS**, per periode bulan-tahun. User bisa sinkron data dari sumber lain, edit stock awal per part, dan upload data massal lewat Excel.

## 2. Aktor & Hak Akses
Dari `router/MainRoutes.ts` (baris ~1487–1499) dan `Stock.ts` (baris 36–38):

| Permission key | Akses |
|---|---|
| `Report.View.Stock` (parent) | Buka halaman `/report/stamping/stock` |
| `Download` (child, terdaftar di route meta) | **Tidak ditemukan pemakaiannya di kode** — lihat Pertanyaan Terbuka |
| `permissions.create` (di store, dari `checkAccess("Report.View.Stock")`) | Menampilkan tombol Save/Reset di modal Upload |

Catatan: `permissions.create` sebenarnya memakai key yang sama dengan permission "View" (`Report.View.Stock`), bukan key `Create` terpisah. Perlu dikonfirmasi apakah ini disengaja atau salah copy-paste dari page lain.

## 3. User Stories
- Sebagai user Stamping, saya ingin memilih bulan & tahun lalu klik "Sync Data", supaya laporan stock menampilkan data periode yang dipilih.
- Sebagai user, saya ingin berpindah antara 3 tab (Stock Blank / Stock IFP / Achievement PCS) untuk melihat jenis laporan berbeda.
- Sebagai user, saya ingin mencari part tertentu lewat kolom search di tiap tab.
- Sebagai user, saya ingin mengedit **Stock Awal** IFP per part lewat modal.
- Sebagai user dengan permission `create`, saya ingin upload file Excel berisi data stock harian per part, melihat preview + validasi error sebelum data disimpan.
- Sebagai user, saya ingin melihat baris "In / Out / Stock Akhir" harian (tab IFP) dan "Lot Size / Actual / Accumulation RH-LH" harian (tab PCS) yang terhitung otomatis dari data harian.

## 4. Functional Requirements
| ID | Requirement | Prioritas |
|---|---|---|
| FR-01 | User memilih bulan & tahun, sistem membentuk `period` (`YYYY-MM`) dan `period2` (`YYYYMM`) secara reaktif (watcher) | Must |
| FR-02 | Tombol "Sync Data" memanggil fetch sesuai tab aktif (`fetchReportBlank` / `fetchReportIFP` / `fetchReportAchievementPeriod`) | Must |
| FR-03 | Tab **Stock Blank**: tabel per part menampilkan Action (Edit), Part Number, Stock Awal | Must |
| FR-04 | Tab **Stock IFP**: tabel per part menampilkan 4 baris (Stock Awal, In, Out, Stock Akhir) untuk tanggal 01–31 (31 kondisional sesuai jumlah hari di bulan tsb), dengan kolom hari-ini di-highlight hijau | Must |
| FR-05 | Tab **Achievement PCS**: tabel per pasangan part RH/LH menampilkan 6 baris (Lot Size RH, Actual RH, Accumulation RH, Lot Size LH, Actual LH, Accumulation LH) untuk tanggal 01–31 | Must |
| FR-06 | Search per-tab: filter client-side berdasarkan `part_number` (Blank/IFP) atau `part_rh`/`part_lh` (PCS) via `filterItems` helper | Must |
| FR-07 | Pagination client-side (rows per page: 8/15/25/50/100, Prev/Next) berlaku untuk data yang sudah difilter | Must |
| FR-08 | Modal Edit Stock Awal IFP: input Part Number + Stock Awal, simpan lewat `onUpdate('ifp')` | Must |
| FR-09 | Modal Upload: pilih file `.xlsx`, parse client-side (lib `xlsx`), validasi wajib isi `part_number` & `job_number` per baris, tampilkan preview tabel dengan indikator error (ikon warning/check) per baris | Must |
| FR-10 | Modal Upload → tombol Save (permission `create`, hanya aktif jika tidak ada error) mengirim data ke endpoint upload; tombol Reset mengosongkan input file & data preview | Must |
| FR-11 | `Stock Akhir` dan `Accumulation RH/LH` dihitung akumulatif dari tanggal 1 s/d hari-N (fungsi `stockAkhir`, `accumRH`, `accumLH`), dan ditandai merah jika hasilnya negatif | Must |

## 5. Struktur Halaman (UI Breakdown)
- **Breadcrumb** — Report > Stamping > Stock Andon Press (`BaseBreadcrumb`).
- **Toolbar atas** — filter bulan/tahun + tombol "Sync Data"; tombol "Upload" (input file Excel tersembunyi); tab switcher (Stock Blank / Stock IFP / Achievement PCS).
- **Tab: Stock Blank** — tabel dengan search Part Number, kolom header tanggal 01–31 (31 kondisional), tapi **baris body hanya menampilkan Action/Part Number/Stock Awal** (lihat Edge Case #1).
- **Tab: Stock IFP** — tabel dengan search Part Number; tiap part = 4 baris (Stock Awal, In, Out, Stock Akhir) x kolom tanggal; footer pagination (rows-per-page, showing X–Y of Z, Prev/Next).
- **Tab: Achievement PCS** — tabel dengan search Part RH & Part LH; tiap pasangan part = 6 baris x kolom tanggal; footer pagination sama seperti tab IFP.
- **Modal Edit Stock Awal IFP** — form 2 kolom (Part Number, Stock Awal), tombol Close/Save.
- **Modal Upload** — filter periode + tombol Sync Data (khusus konteks upload), tabel preview hasil parse Excel (kolom sesuai `datatablesUpload.headers`, kolom "Simulate" = indikator error), tombol Save & Reset (permission-gated).

## 6. Data & API
Sumber: `StockService.ts`, base path `http://{apiUrl}/majsf_rest_api/api/report-stock/*` dan `/api/master/fix_order`.

| Endpoint | Method | Fungsi |
|---|---|---|
| `/report-stock/blank` | GET | Data tab Stock Blank (params: `filterDate`) |
| `/report-stock/ifp` | GET | Data tab Stock IFP (params: `{ period: period2 }` format `YYYYMM`) |
| `/report-stock/period` | GET | Data tab Achievement PCS (params: `filterDate`) |
| `/report-stock/update_qty` | GET | Trigger update qty, lalu otomatis re-fetch Blank |
| `/report-stock/stock_awal` | PUT | Update stock awal (part_number, stock_awal, period, tipe) via `x-www-form-urlencoded` |
| `/master/fix_order` | POST | Upload data massal (FormData, per-field array `key[]`) |

## 7. Business Rules / Validasi
- Upload Excel: baris tanpa `part_number` atau `job_number` ditandai error dan **tidak boleh** disimpan (`error` counter > 0 menonaktifkan tombol Save).
- `onUpdate('ifp')`: `part_number` dan `stock_awal` wajib diisi sebelum submit (validasi di store, bukan di komponen).
- Field yang dikirim saat upload difilter dari daftar `this.form` di store (whitelist kolom yang diteruskan ke backend) — **lihat Edge Case #2, daftar ini tidak lengkap**.
- Kolom tanggal 31 hanya ditampilkan jika bulan aktif punya 31 hari (`['01','03','05','07','08','10','12']`).
- Highlight hijau/oranye pada kolom tanggal aktif dibandingkan dengan `params.day` (hari saat ini dari shift berjalan), bukan dari filter periode yang dipilih user.

## 8. Non-Functional Requirements
- Parsing Excel dilakukan sepenuhnya di client (`xlsx` lib) sebelum dikirim ke server — cocok untuk file kecil-menengah, tapi tidak ada indikasi batas ukuran file/baris.
- Pagination bersifat **client-side** (bukan server-side seperti Master Data) — seluruh data periode di-fetch sekaligus lalu di-slice di frontend. Perlu diperhatikan jika volume part per periode besar.
- Tidak ada realtime sync (socket) di halaman ini — data hanya ter-update saat user klik "Sync Data" atau setelah submit form/upload.

## 9. Edge Cases & Known Issues (temuan dari audit kode)
1. **Tab Stock Blank tidak menampilkan data tanggal** — header tabel (`<thead>`) mendefinisikan kolom 01–31, tapi `<tbody>` (baris 474–498) hanya me-render 3 kolom (Action, Part Number, Stock Awal) dengan `rowspan="4"` tanpa isi kolom tanggal sama sekali. Kemungkinan ini **bagian dari revisi tampilan** yang dimaksud sebelumnya — tab ini terlihat belum selesai dibanding tab IFP/PCS yang sudah lengkap render harian.
2. **Kolom `date_10` tidak ikut terkirim saat upload** — array whitelist `this.form` di `Stock.ts` (baris 89–125) melompat dari `date_09` langsung ke `date_11`, tidak menyertakan `date_10`. Akibatnya data tanggal 10 di file Excel yang diupload user akan **hilang secara diam-diam** (tidak error, tapi tidak terkirim ke backend).
3. **Pagination tidak tab-aware** — `totalItems`, `startItem`, `endItem` (baris 94–102) selalu memakai `filteredItemsPCS().length`, padahal dipakai juga sebagai info paginasi untuk tab Blank & IFP. Info "Showing X to Y of Z" di footer tab IFP kemungkinan menampilkan angka dari data PCS, bukan data IFP yang sedang dilihat.
4. **`console.log(filteredItems())` tertinggal di top-level script** (baris 85) — jalan tiap kali komponen dimuat, kemungkinan sisa debugging.
5. Data kosong/gagal fetch: penanganan lewat `utilityStore.onError` / `onApiResponse` (notifikasi global), tidak ada empty-state visual khusus di tabel (baris tetap kosong tanpa pesan "tidak ada data").

## 10. Out of Scope
- Tidak ada fitur hapus data stock dari UI ini (hanya edit stock awal & upload).
- Tidak ada export/download laporan (berbeda dari Master Data yang punya tombol Unduh Data) — perlu dikonfirmasi apakah child permission `Download` di route meta memang belum diimplementasikan atau sengaja dihilangkan.

## 11. Riwayat Revisi
| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| v1.0 | 2026-07-08 | Draft awal disusun dari kode (`StockPage.vue`, `Stock.ts`, `StockService.ts`, `reportStock.ts`) | Claude |

## 12. Pertanyaan Terbuka
- Apa isi revisi tampilan yang dimaksud user di awal permintaan — apakah salah satunya adalah tab Stock Blank yang belum menampilkan data harian (Edge Case #1)?
- Permission child `Download` terdaftar di route meta tapi tidak dipakai di kode — apakah fitur download memang direncanakan untuk halaman ini?
- Apakah `permissions.create` yang memakai key `Report.View.Stock` (bukan key khusus create) sudah sesuai desain akses, atau harus dipisah?
- Apakah bug `date_10` hilang saat upload (Edge Case #2) perlu difix sebagai bagian dari revisi ini?
