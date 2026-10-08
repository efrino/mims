# PRD/SRS — [Nama Page]

| Field | Value |
|---|---|
| Route | `/module/sub-path` |
| Component | `src/views/.../XxxPage.vue` |
| Module | Welding / Stamping / PCD / ... |
| Owner | Nama PIC |
| Status | Draft / Review / Approved |
| Versi | v1.0 |
| Tanggal | YYYY-MM-DD |

## 1. Ringkasan & Tujuan
- Masalah apa yang diselesaikan page ini, untuk siapa, kenapa perlu ada.
- 2-3 kalimat, bukan esai.

## 2. Aktor & Hak Akses (Permission)
| Role / Permission key | Akses |
|---|---|
| `Report.View.Xxx` (parent) | Bisa buka halaman |
| `Download`, `Create`, ... (child) | Aksi spesifik yang di-gate |

Catatan: cocokkan dengan `meta.permission` di `router/MainRoutes.ts` — jangan menebak, cek langsung.

## 3. User Stories
- Sebagai [role], saya ingin [aksi], supaya [hasil/nilai bisnis].
- (ulangi untuk tiap alur utama: lihat data, filter, tambah, edit, hapus, download, sync, dst.)

## 4. Functional Requirements
Format: `FR-XX` — pernyataan requirement yang testable (bukan deskripsi UI).

| ID | Requirement | Prioritas |
|---|---|---|
| FR-01 | Sistem menampilkan data [X] dalam bentuk tabel/kartu dengan paginasi server-side | Must |
| FR-02 | User dapat memfilter data berdasarkan [kolom/tanggal/area/dll] | Must |
| FR-03 | User dapat mengunduh data sebagai file Excel | Should |
| FR-04 | Perubahan data tersimpan lewat modal form dengan validasi field wajib | Must |
| FR-05 | Data tersinkron realtime antar user via socket (jika ada) | Could |

## 5. Struktur Halaman (UI Breakdown)
Daftar section/komponen sesuai apa yang benar-benar ada di `.vue`-nya (header, toolbar, tabs, tabel, modal-modal). Contoh format:

- **Header** — judul, subtitle, tombol aksi utama (kbd shortcut kalau ada).
- **Toolbar/Filter** — chip layer/area, search, date range.
- **Stats bar** — ringkasan angka (total, missing, synced, dsb) kalau ada.
- **Tabel utama** — kolom, sorting, row actions, pagination.
- **Modal: [Nama]** — tujuan modal, field, tombol simpan/batal, validasi.
- **Empty / Loading / Error state** — apa yang ditampilkan di tiap kondisi.

## 6. Data & API
| Endpoint | Method | Fungsi |
|---|---|---|
| `/module/list` | GET | Ambil data list + filter + pagination |
| `/module/create` | POST | Tambah data baru |
| `/module/update` | PUT | Update data |
| `/module/delete` | DELETE | Hapus (soft/hard) |

Sumber kebenaran: service file di `src/services/.../xxxService.ts` — jangan dokumentasikan endpoint yang tidak ada di kode.

## 7. Business Rules / Validasi
- Aturan wajib isi, format, batas nilai, kombinasi field yang saling bergantung.
- Aturan otorisasi (siapa boleh edit/hapus apa).
- Aturan konsistensi data (mis. tidak boleh duplikat, parent-child harus valid).

## 8. Non-Functional Requirements
- **Performance**: waktu load tabel < Xs untuk N baris; pagination server-side untuk dataset besar.
- **Realtime**: kebutuhan sync socket, debounce, konflik multi-user (kalau relevan).
- **Responsiveness**: perilaku di tablet/mobile (row click → detail modal, dst).
- **Aksesibilitas keyboard**: shortcut key kalau dipakai (mis. `N` = tambah, `D` = download).

## 9. Edge Cases & Error Handling
- Data kosong / gagal fetch / timeout API.
- Konflik data (mis. dua user edit bersamaan, race condition realtime).
- Validasi gagal saat submit form.
- Permission ditolak (parent/child key tidak ada di role user).

## 10. Out of Scope
- Hal yang sengaja tidak dikerjakan di versi ini, supaya scope jelas batasnya.

## 11. Riwayat Revisi
| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| v1.0 | YYYY-MM-DD | Draft awal | |

## 12. Pertanyaan Terbuka
- Hal yang masih perlu dikonfirmasi ke stakeholder/user sebelum implementasi.
