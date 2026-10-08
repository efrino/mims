# PRD/SRS — Master Data Part (Welding)

| Field | Value |
|---|---|
| Route | `/plan/master-data` (lihat `router/MainRoutes.ts`) |
| Component | `src/views/admin/PCD/Master/master-data.vue` |
| Module | Welding — Plan |
| Owner | TBD |
| Status | Draft (disusun dari kode berjalan) |
| Versi | v1.0 |
| Tanggal | 2026-07-08 |

## 1. Ringkasan & Tujuan
Master Data Part adalah pusat kelola data part welding: identitas part, hierarki produksi (parent-child WIP/FP), BOM SAP, area/layer, dan sinkronisasi dengan sumber data eksternal (IFPD/IFPP dari `ms_data_ifp`, BOM dari SAP). Tujuannya menjaga satu sumber kebenaran (master) yang konsisten dengan data transaksional lain (achievement, LKH, mutasi WIP).

## 2. Aktor & Hak Akses
Permission belum ditemukan secara eksplisit di block route untuk halaman ini (perlu dicek ulang di `MainRoutes.ts` karena file ini baru dipindah dari `views/public/welding/plan/master-data.vue` ke `views/admin/PCD/Master/master-data.vue`). **Perlu dikonfirmasi**: apakah `meta.permission` sudah disesuaikan untuk lokasi baru.

## 3. User Stories
- Sebagai PPIC, saya ingin melihat seluruh part dalam tabel dengan filter layer (IFRM/CKD/IFPP/IFPW/IFPD), supaya bisa cek kelengkapan data per area.
- Sebagai PPIC, saya ingin menambah/mengedit part lewat form terstruktur (identitas → proses → mesin → model → layer → area), supaya data tetap konsisten.
- Sebagai PPIC, saya ingin memasangkan WIP ke parent (papan pemasangan), supaya hierarki produksi terhubung.
- Sebagai PPIC, saya ingin sinkronisasi part yang belum ada dari `ms_data_ifp` (IFPD/IFPP sync), supaya master tidak ketinggalan data sumber.
- Sebagai PPIC, saya ingin membandingkan hierarki master vs BOM SAP dan menerapkan rekonsiliasi (tambah/update/re-parent), supaya master mengikuti BOM resmi.
- Sebagai PPIC, saya ingin upload Excel atau paste langsung dari spreadsheet untuk update massal.
- Sebagai user, saya ingin mengunduh data master sebagai Excel.

## 4. Functional Requirements
| ID | Requirement | Prioritas |
|---|---|---|
| FR-01 | Tabel utama menampilkan part dengan paginasi server-side dan filter kolom | Must |
| FR-02 | Toolbar layer tabs (IFRM/CKD/IFPP/IFPW/IFPD) + sub-area chips untuk filter cepat | Must |
| FR-03 | Stats bar menampilkan ringkasan jumlah data sesuai filter aktif | Should |
| FR-04 | Form tambah/edit part dengan langkah bertingkat: pilih Layer → Category → field mengikuti kategori (WELDING/PRESS/SUBCON/CKD/MATERIAL/INHOUSE/OUTHOUSE) | Must |
| FR-05 | Modal Tree menampilkan 2 tab: Hierarki Produksi (parent-child manual) dan BOM SAP (1-step transactional), dengan highlight perbedaan | Must |
| FR-06 | Reconcile Modal: preview otomatis perbedaan master vs BOM SAP (tambah/link existing/update/re-parent/info) sebelum diterapkan | Must |
| FR-07 | Sync IFPD/IFPP: tampilkan missing/synced/orphan, user pilih part untuk di-upsert ke master | Should |
| FR-08 | WipPairingBoard: pasangkan WIP ke parent (attach) atau lepas (detach) di luar form utama | Must |
| FR-09 | Routing multi-mesin per part bisa dilihat dan disimpan lewat Route Editor | Should |
| FR-10 | Update massal via upload Excel atau paste langsung dengan preview sebelum commit | Should |
| FR-11 | Unduh seluruh data master sebagai file Excel | Should |
| FR-12 | Hapus part: soft delete (default) dan hard delete (opsi terpisah, kemungkinan butuh permission lebih tinggi) | Must |
| FR-13 | Upload gambar referensi part, dan lihat gambar lewat modal view-only | Could |
| FR-14 | Override classify: user bisa override kategori otomatis part tertentu | Could |

## 5. Struktur Halaman (UI Breakdown)
- **Header** — judul "MASTER DATA PART", tombol: Unduh Data (`D`), Menu Aplikasi (`U`, dengan badge jumlah orphan sync), Tambah Part (`N`).
- **WipPairingBoard** — panel terpisah untuk pasangkan WIP↔parent, dibuka dari Menu Aplikasi.
- **Modal Sync IFPD** — summary bar (total/missing/synced/orphan) + tabs (Missing/Synced/FP Tanpa Child) + tabel pilih part untuk sync.
- **Modal Sync IFPP** — sama seperti IFPD, ditambah breakdown per tipe area dan filter chip area.
- **Stats bar** — angka ringkasan sesuai filter.
- **Toolbar** — tab layer (IFRM/CKD/IFPP/IFPW/IFPD) + chip sub-area kondisional.
- **Upload Result** — hasil setelah upload Excel.
- **Tabel utama** — data part, sortable, pagination server-side.
- **Modal Tree** — tab Hierarki Produksi vs tab BOM SAP, dengan indikator anak yang tidak match.
- **Modal Reconcile** — daftar aksi (tambah/link/update/re-parent/info) hasil preview, dengan konfirmasi sebelum apply.
- **Modal Override Classify**.
- **Modal Add Child** — tambah komponen (IFPP/CKD) di bawah node tree, mode existing (cari) atau baru (form).
- **Modal Form (Create/Edit)** — tidak bisa ditutup via overlay/ESC (hanya tombol X/Batal, untuk cegah kehilangan input tidak sengaja); bertingkat: Layer → Category → Identitas → Proses & Hierarki → Mesin & Produksi/Stok → (CKD/Supplier/Model sesuai kategori) → Konfigurasi Layer → Area & Periode → Gambar.
- **Modal Image View** — lihat gambar part (read-only).
- **Modal Detail** — dipakai khusus tablet/mobile saat row diklik; tab Hierarki + BOM SAP, plus panel info & aksi.
- **Modal Delete** — konfirmasi hapus, bisa ditutup klik overlay (berbeda dari Form Modal).
- **Modal Routing** — routing proses multi-mesin.
- **Menu Aplikasi** — launcher ikon ke sub-fitur (sync, pairing board, dll).
- **Modal Update via Paste** — tempel data dari Excel dengan preview grid sebelum commit, termasuk legenda kolom yang diterima dan tombol unduh template.
- **Modal Generate Routing**.

## 6. Data & API
Sumber: `src/services/Public/Welding/masterService.ts` (BASE_URL + `/welding_master/*`, kecuali dicatat lain).

| Endpoint | Method | Fungsi |
|---|---|---|
| `/welding_master/filter_options` | GET | Opsi filter dinamis |
| `/welding_master/areas` | GET | Daftar area |
| `/welding_master/stats` | GET | Angka ringkasan |
| `/welding_master/list` | GET | List + filter + pagination |
| `/welding_master/detail` | GET | Detail 1 part |
| `/welding_master/route`, `/route_save` | GET/POST | Routing proses multi-mesin |
| `/welding_ach_seed/route_seed` | POST | Seed routing dari achievement |
| `/welding_master/tree` | GET | Hierarki parent-child |
| `/welding_master/create`, `/update` | POST/PUT | CRUD part |
| `/welding_master/attach_wip`, `/detach_parent` | POST | Pasang/lepas WIP-parent |
| `/welding_master/parents_of`, `/connect_suggest`, `/link_child` | GET/GET/POST | Pencarian & penautan parent-child |
| `/welding_master/ifpd_sync`, `/ifpp_sync` | GET/POST | Sync dari `ms_data_ifp` |
| `/welding_master/ifpd_lookup` | GET | Lookup detail IFPD |
| `/welding_master/sap_stock` | GET | Stok referensi dari SAP |
| `/welding_master/add_mother` | POST | Tambah mother/parent |
| `/welding_master/delete`, `/hard_delete` | DELETE | Soft/hard delete |
| `/welding_master/bom` | GET | BOM SAP |
| `/welding_master/reconcile_preview`, `/reconcile_apply` | POST | Preview & terapkan rekonsiliasi master vs BOM |
| `/welding_master/classify_override` | GET/POST/DELETE | Override kategori part |
| `/welding_master/prewarm`, `/sap_perf` | GET | Prewarm cache & metrik performa SAP |
| `/welding_master/sync_bom` | POST | Sinkron BOM |
| `/welding_master/upload`, `/paste` | POST | Update massal (Excel upload / paste) |
| `/welding_master/upload_image` | POST | Upload gambar part |
| `/welding_master/unpaired` | GET | WIP yang belum dipasangkan ke parent |

## 7. Business Rules / Validasi
- Field wajib dan opsi lanjutan mengikuti **Category** part (WELDING/PRESS/SUBCON/CKD/MATERIAL/INHOUSE/OUTHOUSE) — bukan satu form generik untuk semua.
- **OP** (nomor operasi) harus kelipatan 10; kosong berarti FP tanpa OP.
- **Tipe** hanya dipilih manual untuk kategori WELDING; kategori lain otomatis mengikuti Category.
- **UPH & Stroke** hanya relevan untuk WELDING & PRESS.
- **Stok referensi** (bisa ambil dari SAP) hanya untuk CKD & MATERIAL.
- **Vendor** hanya muncul saat Category = OUTHOUSE.
- **Area**: untuk non-welding + mode auto, area ditentukan otomatis (INHOUSE/OUTHOUSE/CKD/IFRM); untuk WELDING, user pilih area welding secara eksplisit (mode manual = bebas pilih).
- Form Modal (create/edit) tidak boleh tertutup tidak sengaja — hanya lewat tombol X/Batal, ada guard `formSaving` untuk cegah tutup saat proses simpan berjalan.
- Update via paste: hanya kolom sesuai legenda kategori yang diterima; kolom lain diabaikan.

## 8. Non-Functional Requirements
- Pagination bersifat server-side penuh (filter kolom + halaman diproses di backend), bukan client-side slicing.
- Ada mekanisme prewarm cache SAP (`/prewarm`) dan metrik performa (`/sap_perf`) — mengindikasikan kebutuhan menjaga response time saat query SAP besar.
- Responsif: Detail Modal khusus dipakai di tablet/mobile saat row diklik (behavior beda dari desktop yang langsung expand di tabel/tree modal).
- Shortcut keyboard: `D` = unduh data, `U` = menu aplikasi, `N` = tambah part.

## 9. Edge Cases & Error Handling
- IFPD/IFPP sync: kondisi "FP Tanpa Child" (orphan) ditandai badge merah di tombol Menu Aplikasi dan tab terpisah di modal sync.
- Reconcile: harus menangani 5 jenis aksi berbeda (tambah baru, link existing, update, re-parent karena salah nest, info-only) — tiap kasus perlu preview sebelum apply, tidak boleh auto-apply tanpa konfirmasi user.
- Tree modal menampilkan child yang ada di BOM SAP tapi tidak ada di hierarki master (potensi data hilang) dan sebaliknya.
- Delete: soft delete vs hard delete adalah dua aksi terpisah — hard delete berisiko lebih tinggi dan sebaiknya digate permission terpisah (perlu dikonfirmasi ke stakeholder).
- Paste/upload massal: harus ada preview sebelum commit supaya kesalahan format tidak langsung menimpa data.

## 10. Out of Scope
- Belum ada bagian ini yang terdefinisi eksplisit di kode — perlu diklarifikasi ke product owner (mis. apakah hard delete akan dibatasi role tertentu, apakah reconcile bisa di-schedule otomatis).

## 11. Riwayat Revisi
| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| v1.0 | 2026-07-08 | Draft awal disusun ulang dari kode (`master-data.vue`, `masterService.ts`, `master.ts`) | Claude |

## 12. Pertanyaan Terbuka
- Permission key untuk route `master-data.vue` versi baru (`views/admin/PCD/Master/`) belum terverifikasi di `MainRoutes.ts` — apakah sudah dipindah/disesuaikan dari versi lama di `views/public/welding/plan/`?
- Apakah hard delete perlu permission child terpisah (mis. `Delete.Hard`)?
- Apakah reconcile BOM SAP perlu dijadwalkan otomatis (cron) atau selalu manual trigger user?
