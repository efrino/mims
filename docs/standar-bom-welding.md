# Standar BOM & Hierarki Master Data Welding

Dokumen ini jadi acuan tunggal cara menyusun part welding dan komponennya di Master Data (`ms_welding` + `ms_welding_parents`). Tree, "Children by SAP", verifikasi BOM, dan nomor OP semuanya mengikuti aturan di sini. Contoh yang disepakati dengan user pada 2026-09-25: **57106-BZ240-00**.

## 1. Contoh standar

```
FP  57106-BZ240-00   OP20  SA ADM   RSW3        ← Finished Part (dikirim ke customer)
├─ WIP 57234-BZ080-00      WSS ADM  B6          ← sub-assy welding WSS
│   ├─ 9004A-17210         CKD      (nut, dipasok nut feeder mesin B6)
│   └─ P57234-BZ080-00     INHOUSE  B3          ← part press
│       ├─ M57234-BZ080-00 MATERIAL (coil/sheet)
│       └─ SCRAP-ADM       SCRAP
├─ WIP 53735-BZ080-00      WSS ADM  B5
│   ├─ 9004A-17222         CKD
│   └─ P53735-BZ080-00     INHOUSE
└─ WIP 57106-BZ240-00 OP10 SA ADM   RSW3        ← tahap welding sebelumnya, area SAMA
    ├─ WIP 53712-BZ240-00  WSS ADM  H1
    └─ WIP 53728-BZ130-00  WSS ADM  A7
```

## 2. Rantai part number: M → P → (tanpa prefix)

| Prefix | Arti | Category | Contoh |
|---|---|---|---|
| `M…` | Material (coil / sheet) | MATERIAL | M57234-BZ080-00 |
| `P…` | Part hasil press | INHOUSE (press sendiri) / OUTHOUSE (beli dari subcon/vendor) | P57234-BZ080-00 |
| tanpa prefix | Part hasil welding | WELDING (WIP atau FP) | 57234-BZ080-00 |

- Material dipakai part press, jadi `M` ada di bawah `P`.
- Part press dipakai part welding bernomor sama tanpa `P`. Contoh: `P57234-BZ080-00` ada di bawah WIP `57234-BZ080-00`.
- `SCRAP-*` ada di bawah part press, dengan rasio negatif (mis. −0,465 KG).
- **OUTHOUSE bukan area produksi.** OUTHOUSE adalah barang yang **dibeli** dari subcon/vendor. Baris area OUTHOUSE tidak dihitung sebagai plan, actual, atau stok produksi, dan tidak masuk daftar masalah produksi (Info Cepat, MAJA).
- Nama part kosong di satu baris ditampilkan dengan mewarisi nama dari baris lain yang part_number-nya sama. Kalau tidak ada, dari varian `P` (welding `<x>` sama dengan press `P<x>`). Kalau masih tidak ada, dari nama di BOM SAP. Nama warisan tampil miring di tree, dan tidak ditulis ke database.

### Qty Unit & satuan

- Semua komponen fisik (WELDING, INHOUSE, OUTHOUSE, CKD, FP) wajib punya **Qty Unit minimal 1**. Kalau kosong atau ≤0, sistem otomatis mengisi 1.
- Satuan (`uom`) default-nya **PCS** kalau kosong. Satuan yang sudah terisi dari SAP (mis. `ST`) dibiarkan.
- **Pengecualian: MATERIAL & SCRAP.** Keduanya pakai rasio konsumsi per relasi (mis. 0,5 SHT, −0,465 KG) dengan satuan dari SAP, bukan Qty Unit.

## 3. BOM SAP itu "rata", master itu bertingkat

BOM SAP untuk FP mendaftar semua komponen langsung di bawah FP: part `P…`, nut, dan bolt. Level WIP WSS dilewati. Di master, komponen itu ditaruh di bawah WIP yang memakainya.

| Di BOM SAP FP | Di master |
|---|---|
| `P53735-BZ080-00` | di bawah WIP `53735-BZ080-00` (P hilang, status **P → WIP**) |
| nut `9004A-17205` (M8) | di bawah WIP yang mesinnya nut feeder M8 (H1 → `53712-BZ240-00`) |
| komponen yang sudah ada di mana pun dalam pohon FP | sudah tercakup, jangan ditautkan lagi ke FP |

"Children by SAP" otomatis mengikuti aturan ini. Komponen dianggap "sudah ada" kalau ada di mana pun dalam pohon part_number itu: FP, WIP bernomor sama, dan baris runout yang masih tampil.

## 4. Aturan NUT FEEDER

Part WELDING di mesin dengan `welding_spec_machine.nut_feeder = 1` wajib berupa **kombinasi**:

1. komponen INHOUSE/OUTHOUSE (part `P…`), **dan**
2. nut yang dipasok mesin itu (`nut_type`, `nut_type_backup`, atau `id_ms_nut`).

- Nut dicocokkan lewat kode dasarnya: `M6-17210` sama dengan `9004A-17210` (segmen terakhir sama).
- Kalau `nut_type` mesin belum diisi, anak CKD apa pun dianggap nut.
- Kalau kombinasinya belum lengkap, tree menampilkan badge kuning **⚠ NUT**. Ini hanya peringatan, tidak memblok simpan.

## 5. Nomor OP

OP adalah urutan proses **part_number yang sama di area yang sama**, lintas layer: WIP (IFPW) dan FP (IFPD), selama category-nya WELDING.

- Contoh: 57106-BZ240-00 di SA ADM. WIP **OP10** (tahap awal, jadi anak), FP **OP20** (tahap akhir, jadi induk).
- Beda area bukan urutan OP. Tiap area dihitung sendiri.
- Kalau di satu area part itu cuma 1 baris, **tidak ada OP**.
- Urutan penomoran: OP yang sudah ada, lalu WIP sebelum FP, lalu baris paling lama.
- Baris runout tidak diberi OP.
- `op_locked = 1` (diset manual di Edit Part) tidak pernah diubah sistem, tapi tetap dihitung anggota grup.

## 6. BOM terverifikasi (✓ BOM)

- Verifikasi berlaku **per part_number**. Sekali diverifikasi, badge ✓ BOM dan BOM-nya ikut ke semua area dan tree yang memakai part itu.
- Sumbernya BOM SAP, dan boleh **di-adjust** kalau SAP tidak sesuai aktual. Qty yang diubah tersimpan sebagai `ADJUST`, yang sama tersimpan sebagai `SAP`.
- Tiap WIP WSS cukup dicek ke SAP sekali. Setelah itu pakai BOM terverifikasi, tanpa tarik SAP lagi.
- Menu: klik ⋮ di node tree, lalu **Verifikasi BOM**. Pencabutan verifikasi lewat modal yang sama.

## 7. Kode customer & varian delivery

| Akhiran | Arti | Perlakuan di master |
|---|---|---|
| `-26`, `-E26`, `-28`, `-E28` | Kode pesanan **TMMIN** untuk part fisik yang sama (BOM SAP identik atau berisi part dasar ×1) | **Varian delivery** dari part dasar. Order dijumlahkan ke part dasar, bukan baris sendiri. |
| `-KZ` | **Part unik** (dikonfirmasi user 2026-09-25) | Baris master sendiri dengan plan, produksi, dan DN sendiri. **Jangan dilebur.** |
| `-T`, `-L`, dan lainnya | Bukan varian | Biarkan apa adanya. |

Contoh: 57106-BZ240-00 (ADM Plant 5, job GBA-0175) punya varian -26 (TMMIN, T321) dan -E26 (TMMIN, 3576). Ketiganya satu part fisik yang diproduksi di SA ADM.

- **WIP tidak punya varian delivery.** WIP tidak dikirim ke customer, jadi varian default-nya adalah nomor dan job WIP itu sendiri. FP tujuan sebuah WIP dilihat dari hierarki (tab Mother), bukan dari varian. Pada 2026-09-27, 660 varian WIP yang dulu terisi nomor/job FP tujuan (sisa migrasi 2026-09-21) sudah dirapikan. Nilai lamanya tersimpan di kolom `note`.

## 8. Kebersihan relasi

- Parent harus terhubung ke baris **aktif**. Kalau ada baris aktif pengganti, jangan terhubung ke baris runout.
- Baris tidak boleh jadi parent dirinya sendiri (`parent_id = child_id`).
- Kalau part dibuat ulang (baris baru dengan part_number sama), pindahkan relasi dan anak-anaknya ke baris baru.

## Implementasi

| Aturan | Kode |
|---|---|
| Tree + ✓ BOM + ⚠ NUT | `M_weld::get_tree`, `M_weld::annotate_tree`, `BomVerifiedBadge.vue`, `TreeNode.vue` |
| Children by SAP | `Welding_master::_compute_reconcile_diff`, `M_weld::feeder_wip_for_nut` |
| Verifikasi BOM | `M_weld::get_bom_verify` / `save_bom_verify`, `BomVerifyModal.vue`, tabel `ms_welding_bom_verify(_item)` |
| Nomor OP | `M_weld::_op_plan`, `_auto_sequence_op`, endpoint `POST welding_master/resequence_op` |
