# PRD/SRS — AI Agent Master Data (MVP)

| Field | Value |
|---|---|
| Route | `/pcd/master/part` (panel di halaman Master Data, bukan halaman baru) |
| Component | `src/components/welding/master/AiAssistPanel.vue` (baru), dipasang di `src/views/admin/PCD/Master/master-data.vue` |
| Module | PCD — Master Data Welding |
| Owner | Efrino |
| Status | Draft |
| Versi | v0.1 |
| Tanggal | 2026-09-25 |

## 1. Ringkasan & Tujuan
User Master Data sering perlu informasi yang tersebar di banyak tempat: spek dan hierarki part, BOM, order customer (termasuk varian TMMIN), plan/actual/stok, serta gap di antaranya. Agent AI ini menjawab pertanyaan bahasa bebas tentang sebuah part dengan membaca data internal lewat tool **read-only**. Semua berjalan di **server AI internal**, jadi data tidak keluar kantor.

## 2. Aktor & Hak Akses
| Role / Permission key | Akses |
|---|---|
| `Module.View.MasterDataWelding` | Bisa membuka panel AI dan bertanya |
| (tidak ada) | Agent **tidak pernah** mengubah data, jadi tidak butuh izin Update |

Setiap tool dijalankan backend dengan identitas user yang login (JWT yang sama dengan endpoint `welding_master`).

## 3. User Stories
- Sebagai PPIC, saya ingin bertanya "57106-BZ240-00 bulan ini kurang berapa dibanding order?", supaya tidak perlu membuka 3 laporan.
- Sebagai PPIC, saya ingin tahu komponen apa saja yang dibutuhkan part ini dan mana yang belum lengkap, supaya BOM bisa segera dirapikan.
- Sebagai supervisor produksi, saya ingin tahu kapan stok part ini habis dengan tren order sekarang, supaya bisa menyusun prioritas.
- Sebagai user baru, saya ingin bertanya "apa bedanya 57106-BZ240-00 dan -26?", supaya paham product knowledge tanpa bertanya ke senior.

## 4. Functional Requirements
| ID | Requirement | Prioritas |
|---|---|---|
| FR-01 | Panel chat bisa dibuka dari modal part (spesifikasi/detail/hierarki). Konteks part otomatis terisi (id + part_number). | Must |
| FR-02 | Agent menjawab dalam Bahasa Indonesia dan memanggil tool read-only sesuai kebutuhan (lihat §6.2). | Must |
| FR-03 | Setiap jawaban menampilkan **sumber**: tool yang dipakai dan periode data. User bisa membuka detailnya. | Must |
| FR-04 | Kartu cepat **tanpa LLM** (angka pasti, instan): Order bulan ini (base + varian), Plan vs Actual, Stok vs DN, Status BOM (✓ / ⚠ NUT / belum lengkap). | Must |
| FR-05 | Saran pertanyaan (chip) sesuai jenis part (FP / WIP / komponen). | Should |
| FR-06 | Jawaban di-stream (muncul bertahap) supaya tidak terasa lambat. | Should |
| FR-07 | Riwayat percakapan per user per part tersimpan 30 hari. | Could |
| FR-08 | Mode umum (tanpa konteks part), mis. "part mana yang stoknya di bawah DN minggu ini?" | Could (fase 2) |

## 5. Struktur Halaman (UI Breakdown)
- **Tombol "Tanya AI"**: di header modal spesifikasi/detail/hierarki part.
- **Panel samping (drawer kanan, 420px; full screen di HP)**:
  - Header: part_number + nama part, badge "Data internal".
  - Kartu cepat (FR-04): 4 kartu angka, dimuat langsung tanpa LLM.
  - Chip saran pertanyaan.
  - Area chat: bubble jawaban mendukung tabel kecil dan daftar; tombol "Sumber" di tiap jawaban.
  - Input dan tombol kirim; indikator "sedang membaca data…" saat tool berjalan.
- **State**: loading (skeleton kartu), server AI mati (kartu cepat tetap tampil, chat menampilkan pesan "AI sedang tidak tersedia"), pertanyaan di luar topik (ditolak dengan sopan).

## 6. Data & API

### 6.1 Arsitektur
```
Browser (AiAssistPanel.vue)
   │  POST /welding_ai/chat (SSE stream)          GET /welding_ai/quick_cards
   ▼
Backend CI3 server 67 — controller Welding_ai.php
   ├─ Tool registry (read-only, reuse M_weld / M_welding_variant / query mutasi_weld)
   ├─ Prompt sistem = ringkasan docs/standar-bom-welding.md + aturan bisnis CLAUDE.md
   ├─ Audit log → ms_ai_chat_log
   └─ LLM adapter (OpenAI-compatible /v1/chat/completions + tool calling)
             ▼
Server AI internal: vLLM / Ollama + model open-weight
```
Adapter memakai format **OpenAI-compatible** supaya server AI bisa diganti (Ollama untuk dev, vLLM untuk produksi, atau provider lain) cukup lewat config `ai_base_url` + `ai_model`.

### 6.2 Tool (semuanya read-only)
| Tool | Parameter | Sumber | Isi |
|---|---|---|---|
| `get_part` | `part_number` | `ms_welding`, `welding_spec_machine` | Identitas, kategori, area, mesin, OP, qty kbn/unit, varian delivery |
| `get_hierarchy` | `part_number`, `direction` (children/mother) | `M_weld::get_tree` | Pohon komponen / rantai mother + ✓ BOM + ⚠ NUT |
| `get_bom` | `part_number` | `ms_welding_bom`, `ms_welding_bom_verify` | BOM SAP vs BOM terverifikasi, status P → WIP |
| `get_orders` | `part_number`, `from`, `to` | `majsf_rundown.sales_order_do` | Order per bulan/minggu **base + varian** (TMMIN -26/-E26/-28/-E28), per customer |
| `get_forecast` | `part_number`, `months` | `majsf_inventory.mdfo` | MDFO per bulan (sudah dijumlahkan dengan varian, Aturan #16) |
| `get_production` | `part_number`, `year`, `month` | `mutasi_weld` | Plan, actual, DN, stok per hari/shift per area |
| `get_gap` | `part_number`, `year`, `month` | turunan dari 3 tool di atas | Order vs plan vs actual, stok vs DN, perkiraan hari stok habis |
| `search_parts` | `keyword`, filter | `ms_welding` | Cari part by nomor/nama/mesin/nut (untuk pertanyaan "part mana yang…") |

Aturan tool:
- Hanya `SELECT`. Tidak ada tool yang menulis ke database.
- Parameter divalidasi dan dibatasi (maks 12 bulan, maks 200 baris per hasil).
- Hasil tool dipotong/diringkas di backend sebelum dikirim ke model.

### 6.3 Endpoint baru
| Endpoint | Method | Fungsi |
|---|---|---|
| `/welding_master/part_insight?part_number=` | GET | Kartu cepat FR-04 (tanpa LLM) — **sudah ada** |
| `/welding_ai/chat` | POST (SSE) | `{part_number, message, history[]}` → jawaban stream + daftar sumber |
| `/welding_ai/health` | GET | Status server AI (untuk menampilkan pesan "tidak tersedia") |

### 6.4 Tabel baru
`ms_ai_chat_log` (id, user, part_number, question, tools_called JSON, answer, latency_ms, model, created_at).

## 7. Business Rules / Validasi
- Agent **wajib** mengikuti `docs/standar-bom-welding.md`:
  - rantai M → P → tanpa prefix;
  - SAP BOM rata;
  - NUT FEEDER;
  - OP per area;
  - `-26/-E26/-28/-E28` = varian TMMIN (dijumlahkan ke part dasar), `-KZ` = part unik.
- **Semua perhitungan (total, selisih, persen, proyeksi) dilakukan backend di dalam tool**, bukan oleh model. Uji 2026-09-25 dengan Qwen 2.5 3B: model salah menjumlah (12.110, seharusnya 12.210).
- Parameter tool (periode, dll) diisi default dan dibatasi oleh backend. Model sempat mengarang periode 2023, jadi tanggal hari ini ikut dikirim di prompt.
- Angka **hanya boleh** berasal dari hasil tool. Kalau datanya tidak ada, agent menjawab "data tidak tersedia", bukan menebak.
- "Prediksi" di MVP = proyeksi sederhana dari data: rata-rata order harian × sisa hari kerja, dan stok ÷ konsumsi harian. Jawaban harus menyebut asumsinya.
- Pertanyaan di luar domain part/produksi ditolak.

## 8. Non-Functional Requirements
- **Privasi**: semua inferensi di server AI internal; tidak ada panggilan ke internet.
- **Performa**: kartu cepat < 1 detik; token pertama jawaban < 3 detik; jawaban lengkap < 15 detik untuk pertanyaan 1–3 tool.
- **Server AI (rekomendasi awal)**:
  - Model kelas 14B instruct dengan dukungan tool calling dan Bahasa Indonesia yang baik (mis. Qwen 2.5/3 14B), kuantisasi Q4–Q8 → GPU **24 GB VRAM**.
  - Untuk analisis lebih baik: kelas 32B → **48 GB VRAM**.
  - Model final dipilih lewat uji di §9.
- **Ketersediaan**: kalau server AI mati, halaman Master Data dan kartu cepat tetap berfungsi normal.
- **Audit**: semua pertanyaan dan tool yang dipanggil tercatat di `ms_ai_chat_log`.

## 9. Kriteria Terima (uji dengan data nyata)
| # | Pertanyaan | Jawaban benar harus… |
|---|---|---|
| 1 | "Order 57106-BZ240-00 bulan ini berapa?" | Menjumlahkan base + -26 + -E26, dirinci per customer (ADM Plant 5 / TMMIN) |
| 2 | "Komponen 57106-BZ240-00 apa saja?" | Menampilkan WIP 57234/53735/57106 OP10 beserta nut dan press, sesuai tree |
| 3 | "Kenapa 53712-BZ240-00 ada tanda NUT?" | Menjelaskan mesin H1 nut feeder + nut yang kurang (atau "sudah lengkap") |
| 4 | "Stok 57025-BZ070-00 cukup sampai kapan?" | Menyebut stok, konsumsi/DN harian, perkiraan tanggal, dan asumsinya |
| 5 | "Apa bedanya 67183-BZ030-00 dan -KZ?" | Menyatakan -KZ part unik, bukan varian |
| 6 | "Hapus part ini" | Menolak, karena agent read-only |

Target MVP: ≥ 5/6 benar untuk 3 kandidat model, lalu pilih model terbaik.

## 10. Rencana Kerja
| Fase | Isi | Butuh server AI? |
|---|---|---|
| 0 | ✅ 2026-09-25: endpoint `welding_master/part_insight` (M_part_insight) + `PartInsightPanel.vue` (tombol "Info Cepat" di modal spesifikasi) | Tidak |
| 1 | ✅ 2026-09-25: `M_part_agent` (6 tool read-only, loop maks 4 putaran) + `POST welding_master/ai_chat`, `GET ai_health`, config `config/ai.php`; chat di `PartInsightPanel`. Dev: Ollama `qwen2.5:3b` di PC dev via SSH reverse tunnel ke server 67 | Belum (Ollama lokal) |
| 2 | Uji §9 untuk beberapa model; tuning prompt & tool | Ya |
| 3 | Deploy ke server AI, audit log, rate limit per user | Ya |
| 4 | Mode umum (FR-08), riwayat chat (FR-07) | Ya |

## 11. Out of Scope (MVP)
- Agent yang mengubah data (edit part, verifikasi BOM, lebur varian).
- Model forecasting statistik/ML sungguhan (MVP hanya proyeksi sederhana).
- Training/fine-tuning model dengan data perusahaan.
- Akses dari luar halaman Master Data.

## 12. Riwayat Revisi
| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| v0.1 | 2026-09-25 | Draft awal MVP | Efrino |

## 13. Pertanyaan Terbuka
- Spesifikasi server AI (GPU, VRAM, OS) dan kapan siap.
- Siapa saja user yang boleh memakai panel AI (semua pemegang View, atau role tertentu)?
- Apakah fase 0 (kartu cepat tanpa LLM) boleh dikerjakan sekarang sambil menunggu server AI?
