# MIMS Style Guide
> Standar UI/UX untuk Vue3 + Tailwind CSS  
> **Semua programmer wajib mengikuti panduan ini agar tampilan konsisten di semua halaman.**

---

## Daftar Isi
1. [Typography](#1-typography)
2. [Warna & Semantik](#2-warna--semantik)
3. [Spacing & Border Radius](#3-spacing--border-radius)
4. [Table](#4-table)
5. [Pagination](#5-pagination)
6. [Button](#6-button)
7. [Form & Input](#7-form--input)
8. [Card](#8-card)
9. [Badge / Status Chip](#9-badge--status-chip)

---

## 1. Typography

### Font Family
- Default: **Poppins** — sudah dikonfigurasi di `tailwind.config.js`, tidak perlu tambah class.
- Jangan override dengan font lain kecuali ada kebutuhan khusus dan sudah disetujui tim.

### Skala Teks

| Penggunaan | Class Tailwind | Ukuran | Weight |
|---|---|---|---|
| Page Title | `text-2xl font-semibold` | 24px | 600 |
| Section / Card Title | `text-lg font-semibold` | 18px | 600 |
| Subsection / Card Header | `text-[15px] font-semibold` | 15px | 600 |
| Body text (default) | `text-sm` | 14px | 400 |
| Teks tabel, label form, info sekunder | `text-sm text-gray-500` | 14px | 400 |
| Thead / Label kolom tabel | `text-xs font-semibold uppercase tracking-wide` | 12px | 600 |

### Aturan
- ❌ Jangan pakai `text-base` (16px) untuk teks tabel atau form — terlalu besar.
- ❌ Jangan bold sembarangan — `font-semibold` hanya untuk heading & label.
- ✅ Default body text = `text-sm`, bukan `text-base`.

---

## 2. Warna & Semantik

Standar warna di project ini berbasis **semantik** — programmer bebas memilih shade Tailwind yang sesuai, selama maknanya konsisten. Jangan gunakan warna secara acak tanpa makna.

### Panduan Semantik Warna

| Konteks | Warna | Contoh Penggunaan |
|---|---|---|
| **Primary / Aksi Utama** | Biru | Tombol utama, halaman aktif pagination, link |
| **Success / OK / Selesai** | Hijau | Tombol simpan, badge "Active", konfirmasi berhasil |
| **Danger / Error / Hapus** | Merah | Tombol hapus, badge "Error", pesan gagal |
| **Warning / Perhatian** | Kuning atau Oranye | Badge "Pending", pesan peringatan, data belum lengkap |
| **Info / Netral Informatif** | Biru muda atau Indigo | Badge "Info", tooltip, notifikasi non-kritis |
| **Neutral / Draft / Tidak Aktif** | Abu-abu | Badge "Draft", teks disabled, elemen tidak aktif |

### Aturan Warna
- ✅ Gunakan **warna pastel / light** (shade 50–200) untuk background badge dan alert — bukan warna solid.
- ✅ Gunakan **warna solid / medium** (shade 500–600) untuk background button.
- ✅ Hover state button: selalu naikkan satu shade (mis. 500 → 600) — jangan loncat ke 800 atau 900.
- ❌ Jangan gunakan warna yang bertentangan dengan semantiknya — misal merah untuk tombol simpan.
- ❌ Jangan gunakan warna dekoratif yang tidak punya makna fungsional.

### Warna Teks & Background Struktural

| Elemen | Panduan |
|---|---|
| Teks utama (heading, isi data) | Warna gelap — gunakan `gray-900` atau `gray-800` |
| Teks sekunder (label, caption, info) | Warna sedang — gunakan `gray-500` atau `gray-600` |
| Teks disabled / hint | Warna muda — gunakan `gray-400` |
| Background halaman | `gray-50` — sangat terang, bukan putih murni |
| Background card / panel | `white` |
| Background thead tabel | `gray-50` |
| Baris tabel (zebra) | Ganjil: `white` · Genap: `gray-50` |

---

## 3. Spacing & Border Radius

### Skala Spacing yang Dipakai

| Class | Nilai | Penggunaan |
|---|---|---|
| `p-1 / gap-1` | 4px | Micro spacing |
| `p-2 / gap-2` | 8px | Tight |
| `p-3 / gap-3` | 12px | Compact |
| `p-4 / gap-4` | 16px | Default |
| `p-5 / gap-5` | 20px | Card body kompak |
| `p-6 / gap-6` | 24px | Card body form |
| `p-8 / gap-8` | 32px | Padding container pagination |

### Border Radius

| Class | Nilai | Penggunaan |
|---|---|---|
| `rounded` | 6px | Tombol navigasi pagination |
| `rounded-lg` | 8px | Input, select, search box |
| `rounded-xl` | 12px | Card, table wrapper |
| `rounded-full` | ∞ | Action button, badge status |

### Aturan Radius
- **Table wrapper** → `rounded-xl`
- **Input / select / search** → `rounded-lg`
- **Action button** → `rounded-full`
- **Badge** → `rounded-full`
- ❌ Jangan pakai `rounded-md` untuk button atau input.

---

## 4. Table

### Komponen yang Tersedia

Selalu gunakan komponen yang sudah ada. Jangan buat tabel dari scratch.

| Komponen | File | Kapan Dipakai |
|---|---|---|
| `TableSearch` | `src/components/table/TableSearch.vue` | Tabel standar — sort + global search otomatis |
| `DataTableFilter` | `src/components/table/DataTableFilter.vue` | Tabel dengan filter input per kolom |

### Fitur Minimal pada Setiap Tabel

Setiap tabel **minimal** harus memiliki tiga fitur berikut. Tanpa ketiganya, tabel dianggap belum sesuai standar.

| # | Fitur | Keterangan |
|---|---|---|
| 1 | **Sort per kolom** | Setiap kolom data bisa diklik untuk sort ↑↓ |
| 2 | **General Search** | Satu search box di kanan atas yang mencari semua kolom |
| 3 | **Pagination** | Navigasi halaman + rows per page, menggunakan `Pagination.vue` |

#### 1. Sort per Kolom
- Setiap kolom data harus bisa diklik untuk sort ascending / descending.
- Ditandai dengan ikon sort (↕) di sebelah kanan label kolom header.
- Kedua komponen di atas sudah mengaktifkan `sortable: true` otomatis via `simple-datatables`.
- Jika terpaksa membuat tabel manual, wajib tambahkan ikon dan handler sort secara eksplisit.
- **Pengecualian:** kolom "Aksi" tidak perlu sort.

```html
<!-- Header kolom dengan ikon sort (tabel manual) -->
<th @click="sort('nama_kolom')"
    class="px-4 py-2 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none">
  <span class="flex items-center gap-1">
    Nama Kolom
    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
            stroke-width="2" d="m8 15 4 4 4-4m0-6-4-4-4 4"/>
    </svg>
  </span>
</th>
```

#### 2. General Search (Pencarian Global)
- Setiap tabel wajib memiliki satu search box yang mencari di **semua kolom sekaligus**.
- Posisi: **kanan atas** tabel, sejajar dengan judul card / toolbar.
- `TableSearch.vue` sudah handle ini otomatis (`searchable: true`).
- Untuk `DataTableFilter.vue`, tetap wajib tambahkan search box manual di atas tabel.

#### 3. Pagination
- Setiap tabel wajib menggunakan komponen `Pagination.vue` di `src/components/table/`.
- Lihat spesifikasi lengkap di [bagian Pagination](#5-pagination).

```html
<!-- Search box di atas tabel -->
<div class="flex items-center justify-between mb-3">
  <h3 class="text-[15px] font-semibold">Judul Tabel</h3>
  <div class="relative">
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
         xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
            d="m21 21-3.5-3.5M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z"/>
    </svg>
    <input v-model="searchQuery" type="search" placeholder="Cari..."
           class="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg
                  focus:ring-2 focus:border-blue-500 focus:bg-white outline-none w-64" />
  </div>
</div>
```

### Cara Pakai Komponen

**Tabel standar → `TableSearch`** (sort + search otomatis):
```vue
<TableSearch
  :columns="[
    { key: 'name', label: 'Nama' },
    { key: 'category', label: 'Kategori' },
  ]"
  :rows="dataRows"
/>
```

**Tabel dengan filter per kolom → `DataTableFilter`** (tambahkan search box manual di atasnya):
```vue
<DataTableFilter
  :columns="[
    { key: 'name', label: 'Nama', filterable: true },
    { key: 'action', label: 'Aksi', filterable: false },
  ]"
  :rows="dataRows"
/>
```

### Spesifikasi Padding

| Area | Horizontal | Vertical | Class |
|---|---|---|---|
| **THEAD** | 16px | 8px | `px-4 py-2` |
| **TBODY** | 20px | 10px | `px-5 py-2.5` |

### Spesifikasi Baris

| Properti | Class |
|---|---|
| Baris ganjil | `bg-white` |
| Baris genap | `bg-gray-50` |
| Garis bawah | `border-b border-gray-200` |
| Hover | `hover:bg-blue-50` |

### Kolom Aksi
- Letakkan di **paling kanan**.
- Gunakan button XSmall: `text-xs px-3 py-1 rounded-full`
- Maksimal **3 aksi** per baris. Jika lebih, gunakan dropdown menu.

### Aturan
- ❌ Tabel tanpa sort, search, atau pagination dianggap belum sesuai standar.
- ❌ Jangan buat tabel dari scratch — selalu gunakan `TableSearch.vue` atau `DataTableFilter.vue`.
- ✅ Wrapper tabel wajib `overflow-x-auto rounded-xl border border-gray-200`.

---

## 5. Pagination

### Layout

3 bagian dalam satu baris (`flex-row` desktop, `flex-col` mobile):

```
[ Info: Showing 1-10 of 47 ] ——— [ « ‹ 1 2 3 4 5 › » ] ——— [ Rows: 10 ▾ ]
```

### Spesifikasi

**Container:** `flex flex-col md:flex-row items-center justify-between gap-3 px-8 py-3.5`

| Bagian | Detail |
|---|---|
| ① Info | `"Showing X - Y of Z"` · `text-sm` · warna teks sekunder |
| ② Navigasi | `«  ‹  [1] 2 3 4 5  ›  »` · max 5 nomor · aktif pakai warna primary |
| ③ Rows/Page | Label `"Rows:"` · options: **5, 10, 25, 50** · default: **10** |

### Aturan
- ✅ Gunakan komponen `Pagination.vue` di `src/components/table/` — jangan buat ulang.
- ✅ Tampilkan max **5 nomor halaman** sekaligus.
- ✅ Label konsisten: `"Rows:"` — bukan "Items per page", "Per halaman", dll.

---

## 6. Button

### Semantik Warna Button

| Jenis | Warna | Penggunaan |
|---|---|---|
| **Primary** | Biru | Aksi utama halaman, navigasi ke langkah berikut |
| **Success** | Hijau | Simpan, Konfirmasi, Submit form |
| **Danger** | Merah | Hapus, Batalkan transaksi |
| **Warning** | Oranye / Kuning | Reset, Aksi berisiko yang perlu perhatian |
| **Secondary** | Putih + border abu | Batal, Kembali, Detail (non-destructive) |

### Ukuran

| Ukuran | Padding | Text | Penggunaan |
|---|---|---|---|
| Large | `px-5 py-2` | `text-sm` | Submit form utama, modal confirm |
| **Default** | `px-4 py-2` | `text-sm` | Toolbar, aksi utama halaman |
| Small | `px-3.5 py-1.5` | `text-xs` | Aksi dalam card |
| XSmall | `px-3 py-1` | `text-xs` | Aksi dalam baris tabel |

> `py` maksimal **py-2** · `py` minimal **py-1**

### Template Class

```html
<button class="flex items-center gap-2 font-medium rounded-full text-sm px-4 py-2
               text-white bg-[warna]-500 hover:bg-[warna]-600
               focus:outline-none focus:ring-2 focus:ring-[warna]-300">
  Label
</button>
```

### Aturan
- ❌ Wajib `rounded-full` untuk semua action button — jangan `rounded-md` atau `rounded-lg`.
- ❌ Jangan mix ukuran button dalam satu toolbar tanpa alasan.
- ✅ Button dengan icon: `flex items-center gap-2`.
- ✅ Hover: naikkan 1 shade (500 → 600).

---

## 7. Form & Input

### Class Standar Input

```html
<input class="w-full bg-gray-50 border border-gray-300 rounded-lg
              px-3.5 py-2.5 text-sm
              focus:ring-2 focus:border-blue-500 focus:bg-white outline-none" />
```

### Label

```html
<label class="block text-sm font-semibold mb-1.5">Nama Field</label>
```

### Layout Form

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label class="block text-sm font-semibold mb-1.5">Label</label>
    <input class="w-full ... rounded-lg px-3.5 py-2.5 text-sm ..." />
  </div>
</div>

<!-- Tombol selalu di kanan bawah, urutan: [Batal] [Simpan] -->
<div class="flex justify-end gap-2 mt-4">
  <button class="... rounded-full px-4 py-2 text-sm">Batal</button>
  <button class="... rounded-full px-4 py-2 text-sm">Simpan</button>
</div>
```

### Aturan
- ❌ Wajib `rounded-lg` untuk semua input — jangan `rounded-md` atau `rounded-sm`.
- ❌ Jangan hilangkan focus ring (`focus:ring-2`).
- ✅ Label selalu di **atas** input, bukan di samping (kecuali filter toolbar).
- ✅ Urutan tombol form: [Batal] [Simpan] — tombol primary di paling kanan.

---

## 8. Card

### Struktur

```html
<div class="bg-white border border-gray-200 rounded-xl shadow-sm">

  <!-- Header (opsional) -->
  <div class="px-5 py-4 border-b border-gray-200">
    <h3 class="text-[15px] font-semibold">Judul Card</h3>
  </div>

  <!-- Body -->
  <div class="p-5"><!-- konten --></div>

</div>
```

### Spesifikasi

| Bagian | Class |
|---|---|
| Wrapper | `bg-white border border-gray-200 rounded-xl shadow-sm` |
| Header | `px-5 py-4 border-b border-gray-200` |
| Body (form) | `p-6` |
| Body (kompak) | `p-5` |

### Komponen yang Tersedia
- `UiTitleCard.vue` — card dengan judul di atas konten
- `UiParentCard.vue` — card dengan judul dan action slot

### Aturan
- ❌ Wajib `rounded-xl` — jangan `rounded-md` atau `rounded-lg`.
- ✅ Gunakan `shadow-sm` untuk card biasa — bukan `shadow-lg`.

---

## 9. Badge / Status Chip

### Class Dasar

```html
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
             bg-[warna]-100 text-[warna]-800">
  Label
</span>
```

### Semantik Warna Badge

| Status | Warna | Kapan Digunakan |
|---|---|---|
| Active / Success / OK | Hijau | Data aktif, proses selesai, scan berhasil |
| Inactive / Error / Gagal | Merah | Data tidak aktif, proses gagal, error |
| Pending / Warning | Kuning atau Oranye | Menunggu, butuh perhatian, belum selesai |
| Info | Biru atau Indigo | Informasi tambahan, status netral positif |
| Neutral / Draft | Abu-abu | Draft, tidak diketahui, status default |

### Aturan
- ❌ Jangan pakai warna solid (shade 500+) untuk background badge — gunakan pastel (shade 100).
- ✅ Badge selalu `rounded-full` dan `text-xs font-semibold`.
- ✅ Background badge: shade **100** · Teks badge: shade **700–800**.

---

## Checklist Sebelum Push

- [ ] Font default Poppins — tidak ada override font sembarangan
- [ ] Text size `text-sm` untuk body/tabel/form, bukan `text-base`
- [ ] Warna button sesuai semantik (biru=primary, hijau=sukses, merah=hapus)
- [ ] Semua action button `rounded-full`
- [ ] Hover button naik 1 shade (500→600)
- [ ] Semua input `rounded-lg` dengan `focus:ring-2`
- [ ] Label input di atas field, bukan di samping
- [ ] Table thead: `px-4 py-2` · tbody: `px-5 py-2.5`
- [ ] Table wrapper: `overflow-x-auto rounded-xl border border-gray-200`
- [ ] **Setiap tabel punya sort pada semua kolom data** (pakai `TableSearch.vue` / `DataTableFilter.vue`)
- [ ] **Setiap tabel punya general search box** di kanan atas
- [ ] Kolom "Aksi" tidak perlu sort
- [ ] Pagination pakai komponen `Pagination.vue` yang sudah ada
- [ ] Badge background pastel (shade 100), teks gelap (shade 700–800)
- [ ] Card wrapper `rounded-xl shadow-sm`

---

*Terakhir diperbarui: 2026-06-22 · Branch: satriya/fix/styling*
