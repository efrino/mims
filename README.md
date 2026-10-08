# MIMS — MAJ Integrated Management System

Aplikasi internal berbasis web untuk PT Mekar Armada Jaya (MAJ) yang mencakup manajemen inventaris, produksi, laporan, dan operasional lintas department (Stamping, Welding, Logistik, PCD, HRD, Marketing).

---

## Wajib Dibaca Sebelum Berkontribusi

Sebelum menulis satu baris pun kode, seluruh programmer **wajib** membaca dan memahami coding & UI style guide yang berlaku di proyek ini untuk diterapkan:

> **Coding Style Guide:** https://farhans-organization-9.gitbook.io/coding-styleguides

> **UI Style Guide:** https://mims-style-guide.netlify.app/

## Dokumen tersebut **merupakan (Single Source of Truth)** untuk standar arsitektur, penamaan, struktur folder, pola komunikasi API, komponen UI, dan konvensi kode. Semua implementasi harus mengikuti aturan yang tertulis di sana.

## Arsitektur Proyek

```
src/
├── assets/            # Gambar, ikon, font statis
├── components/        # Komponen reusable global
│   ├── shared/        # Komponen dasar (BaseBreadcrumb, dll)
│   ├── table/         # Komponen tabel (DataTableFilter, dll)
│   ├── apps/          # Komponen fitur spesifik
│   └── welding/       # Komponen domain Welding
├── composables/       # Vue composables (logika yang dapat dipakai ulang)
├── layouts/           # Layout halaman (sidebar, header, full, blank)
├── plugins/           # Konfigurasi plugin (Vuetify, dll)
├── router/            # Definisi route Vue Router
├── scss/              # Global SCSS / theme override
├── services/          # Layer service HTTP (Axios instance, interceptor)
├── stores/            # Pinia stores, dikelompokkan per domain:
│   ├── Admin/
│   ├── HRD/
│   ├── Logistik/
│   ├── Marketing/
│   ├── PCD/
│   ├── Stamping/
│   ├── Welding/
│   ├── auth.ts        # Store autentikasi
│   ├── config.ts      # Store konfigurasi global (URL API, dll)
│   └── notification.ts
├── types/             # TypeScript interface & type definitions
├── utils/             # Helper / utility functions
└── views/             # Halaman Vue, dikelompokkan setiap department:
    ├── admin/
    │   ├── Admin/
    │   ├── HRD/
    │   ├── Logistik/
    │   ├── Marketing/
    │   ├── PCD/
    │   ├── Stamping/
    │   └── Welding/
    ├── auth/          # Halaman login
    ├── dashboard/     # Dashboard utama
    └── public/        # Halaman publik (andon display, dll)
```

### Pola Arsitektur

```
View  →  Store  →  Service  →  REST API Backend
```

- **View** berfungsi untuk tampilan pada user.
- **Store** berfungsi menyimpan state dan memanggil service.
- **Service** berfungsi menangani HTTP request dan transformasi data.
- Komponen **tidak memanggil API secara langsung** — selalu melalui store.

---

## Cara Menjalankan Proyek

### Prasyarat

Pastikan environment berikut sudah tersedia di komputer Anda:

- [Node.js](https://nodejs.org/) versi **18 atau lebih baru**
- npm versi **9 atau lebih baru** (sudah termasuk dalam Node.js)
- Akses ke jaringan internal MAJ (untuk koneksi ke API backend)

### 1. Clone Repository

```bash
git clone <url-repository-ini>
cd inventory-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Sesuaikan URL API backend di file `src/stores/config.ts`. Pastikan nilai `apiUrl` mengarah ke server backend yang aktif di jaringan Anda.

### 4. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173` (port default Vite).

Untuk dapat running di menggunakan local di komputer lain gunakan

```bash
npm run dev --host
```

Aplikasi akan berjalan di `http://(ip komputer anda):5173` (port default Vite).

---

## Build untuk Production / Staging

### Build Production

```bash
npm run build-prod
```

Output akan masuk ke folder `dist/` dengan base URL `/mims/`.

### Build Staging

```bash
npm run build-stage
```

Output masuk ke folder `dist/` dengan base URL `/vue/free/stage/`.

### Preview Build Lokal

```bash
npm run preview
```

Aplikasi preview berjalan di `http://localhost:5050`.

### Deploy ke Server 67

Deploy ke `192.168.10.67:/home/armada/public_html/mims` memakai script [`scripts/deploy-fe.sh`](scripts/deploy-fe.sh). Jalankan dari root repo, di terminal mana pun (Git Bash, PowerShell, cmd, atau terminal VS Code):

| Perintah | Fungsi |
|---|---|
| `npm run ssh:setup` | Menyiapkan SSH tanpa password ke server 67. **Cukup sekali per komputer.** |
| `npm run deploy:67` | Pull `main`, build, lalu deploy ke server 67. |
| `npm run deploy:67:rollback` | Kembali ke build sebelumnya. |

Syarat:

- [Git for Windows](https://git-scm.com/download/win) terpasang (sudah termasuk Git Bash dan OpenSSH). Script `npm run` otomatis memakai Git Bash, jadi aman walaupun dijalankan dari PowerShell atau cmd.
- Branch aktif `main` dan tidak ada perubahan yang belum di-commit.
- SSH ke `root@192.168.10.67` bisa tanpa password. Jika belum, jalankan `npm run ssh:setup`.

#### Menyiapkan SSH (sekali per komputer)

```bash
npm run ssh:setup
```

Script [`scripts/setup-ssh.sh`](scripts/setup-ssh.sh) melakukan langkah berikut. Setiap langkah dilewati kalau sudah beres, jadi aman dijalankan ulang.

1. Jika SSH tanpa password sudah jalan, script langsung selesai.
2. Membuat SSH key `~/.ssh/id_ed25519` **tanpa passphrase**, karena deploy berjalan tanpa interaksi (`BatchMode`). Key lama dipakai kalau sudah ada. File `~/.ssh/id_ed25519` adalah private key: **jangan pernah dibagikan**.
3. Memasang public key ke `authorized_keys` server. Langkah ini meminta **password root server satu kali**. Key tidak ditambahkan dua kali.
4. Menguji login tanpa password.

Tidak punya password root? Kirim isi file `~/.ssh/id_ed25519.pub` (public key, aman dibagikan) ke rekan yang sudah punya akses. Rekan itu cukup menambahkannya sebagai satu baris baru di `/root/.ssh/authorized_keys` server 67. Setelah itu jalankan lagi `npm run ssh:setup` untuk memastikan koneksi berhasil.

Urutan kerja script:

1. `git pull origin main`. Jika terjadi konflik, script berhenti dan menampilkan file yang konflik. Selesaikan konflik, commit, lalu jalankan ulang script.
2. `npm run build`. Hasil build masuk ke `dist/` dengan base URL `/mims/`.
3. Isi `dist/` dikemas menjadi satu file `.tar.gz`, lalu di-upload dan diekstrak ke folder staging `mims-new`. Folder `mims` yang sedang live belum disentuh, jadi upload yang gagal tidak merusak aplikasi.
4. Script memverifikasi `mims-new/index.html`. File `.htaccess` dari `mims` lama disalin ke build baru, karena file ini hanya ada di server dan berisi rewrite SPA ke `/mims/index.html`.
5. Rotasi folder: `mims-backup` dihapus, `mims` diganti nama menjadi `mims-backup`, lalu `mims-new` menjadi `mims`. Jika langkah terakhir gagal, `mims-backup` dikembalikan menjadi `mims`.
6. Smoke test `http://192.168.10.67/mims/` harus mengembalikan HTTP 200.

Hash commit yang sedang live tersimpan di `mims/.deploy-version`. Script memakai lock di server, sehingga dua deploy tidak bisa berjalan bersamaan.

Rollback ke build sebelumnya (menukar `mims` dan `mims-backup`):

```bash
npm run deploy:67:rollback
```

Untuk server lain, salin isi folder `dist/` ke direktori web server (Nginx / Apache). Pastikan web server dikonfigurasi untuk melayani SPA (redirect semua request ke `index.html`).

Contoh konfigurasi Nginx untuk SPA:

```nginx
location /mims/ {
    alias /var/www/mims/;
    try_files $uri $uri/ /mims/index.html;
}
```

---

## Scripts Tersedia

| Perintah              | Fungsi                                 |
| --------------------- | -------------------------------------- |
| `npm run dev`         | Jalankan development server            |
| `npm run build`       | Build dengan type-check (base default) |
| `npm run build-prod`  | Build production (`/mims/`)            |
| `npm run build-stage` | Build staging (`/vue/free/stage/`)     |
| `npm run preview`     | Preview hasil build di port 5050       |
| `npm run typecheck`   | Cek type TypeScript tanpa build        |
| `npm run lint`        | Lint dan auto-fix kode                 |

---

## Konvensi Penting

- Setiap fitur baru mengikuti struktur domain yang sudah ada (`stores/<Domain>/`, `views/admin/<Domain>/`).
- Gunakan komponen yang sudah ada sebelum membuat komponen baru.
- Semua pemanggilan API wajib melewati Store, bukan langsung dari komponen.
- Penamaan file komponen menggunakan **PascalCase**. Penamaan store dan service menggunakan **camelCase**.
- Selengkapnya wajib dan pelajari coding style guide di link yang tertera di atas.

---

## Lisensi

Proyek ini adalah aplikasi internal milik PT Mekar Armada Jaya. Tidak untuk didistribusikan ke publik.
