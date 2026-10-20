<p align="center">
  <img src="assets/img/logo-sicaf.svg" alt="Logo SICAF" width="96" />
</p>

<h1 align="center">SICAF</h1>
<p align="center"><strong>Sistem Informasi Cakap Arsip dan Persuratan</strong><br />SMK Negeri 1 Sedayu</p>

<p align="center">
  Capstone Project STSI4440 &middot; Program Studi Sistem Informasi &middot; Fakultas Sains dan Teknologi &middot; Universitas Terbuka &middot; 2026
</p>

---

## Daftar Isi

1. [Tentang SICAF](#tentang-sicaf)
2. [Anggota Kelompok](#anggota-kelompok)
3. [Latar Belakang](#latar-belakang)
4. [Tujuan](#tujuan)
5. [Ruang Lingkup](#ruang-lingkup)
6. [Fitur](#fitur)
7. [Peran Pengguna (RBAC)](#peran-pengguna-rbac)
8. [Tech Stack](#tech-stack)
9. [Cara Kerja Sistem](#cara-kerja-sistem)
10. [Struktur Basis Data](#struktur-basis-data)
11. [Struktur Folder](#struktur-folder)
12. [Instalasi dan Menjalankan](#instalasi-dan-menjalankan)
13. [Pengujian (Black Box)](#pengujian-black-box)

---

## Tentang SICAF

**SICAF (Sistem Informasi Cakap Arsip dan Persuratan)** adalah aplikasi berbasis web untuk
**penomoran surat otomatis** dan **pengarsipan dokumen digital** di SMK Negeri 1 Sedayu.

Dengan SICAF, guru dan staf mengajukan surat secara daring dan langsung mendapatkan nomor surat
yang sesuai format sekolah. Surat kemudian diverifikasi oleh Tata Usaha, disetujui oleh Kepala
Sekolah, lalu tersimpan sebagai arsip digital yang dapat dicari kembali berdasarkan nomor, jenis,
dan tanggal surat.

## Anggota Kelompok

| No | Nama | NIM |
|:--:|---|---|
| 1 | Amanda Nurhalizah | 051597276 |
| 2 | Sunnardi | 054788427 |
| 3 | Intan Ratulia | 054874162 |
| 4 | Ahmad Fikri Dhani | 051320362 |
| 5 | Candra Fariska Prasetyansyah | 048057933 |

## Latar Belakang

Pengelolaan surat masuk dan surat keluar di SMK Negeri 1 Sedayu masih dilakukan secara
konvensional dengan mencatatnya pada buku agenda. Cara ini menimbulkan beberapa kendala:

- **Nomor surat ganda** akibat pencatatan manual.
- **Pencarian arsip lama memakan waktu** karena dokumen belum terdigitalisasi.
- **Dokumen berisiko hilang atau rusak** karena hanya disimpan dalam bentuk fisik.
- **Pelaporan data persuratan lambat** ketika dibutuhkan secara cepat.

SICAF dibangun untuk mengotomatiskan penomoran surat sekaligus menyediakan media pengarsipan
digital yang terpusat.

## Tujuan

**Tujuan umum:** membangun sistem informasi penomoran dan pengarsipan dokumen digital yang membantu
SMK Negeri 1 Sedayu mengelola administrasi persuratan secara lebih efisien dan terintegrasi.

**Tujuan khusus:**

1. Mengidentifikasi alur dan permasalahan penomoran serta pengarsipan dokumen yang berjalan saat ini.
2. Merancang mekanisme penomoran surat otomatis dan terstruktur untuk menghindari duplikasi nomor.
3. Membangun fitur pengarsipan dokumen digital agar surat tersimpan rapi dan mudah ditelusuri.
4. Menguji sistem untuk memastikan sistem berjalan sesuai kebutuhan dan mudah digunakan petugas Tata Usaha.

## Ruang Lingkup

- Berfokus pada penomoran dan pengarsipan dokumen digital di SMK Negeri 1 Sedayu.
- Mencakup penambahan, penyimpanan, pengubahan, dan penghapusan data dokumen.
- Penomoran dokumen sesuai format yang digunakan sekolah.
- Unggah, pencarian, dan pengelolaan dokumen berdasarkan nomor, jenis, dan tanggal.
- Dikembangkan berbasis web.

## Fitur

| Fitur | Keterangan |
|---|---|
| **Ambil Nomor Surat** | Mengisi data surat dan mengunggah dokumen; nomor surat terbit otomatis dengan pratinjau sebelum diajukan |
| **Surat Saya** | Riwayat pengajuan beserta statusnya; surat dapat diubah, diperbaiki setelah revisi, atau dihapus |
| **Verifikasi Surat** | Tata Usaha memeriksa surat, lalu meneruskannya ke Kepala Sekolah atau mengembalikannya dengan catatan revisi |
| **Persetujuan Surat** | Kepala Sekolah menyetujui, meminta revisi, atau menolak surat dengan alasan |
| **Arsip Surat Keluar** | Surat yang disetujui; pencarian berdasarkan nomor/perihal, jenis surat, dan rentang tanggal |
| **Arsip Surat Masuk** | Pencatatan surat masuk dengan nomor agenda otomatis beserta dokumennya |
| **Rekap Persuratan** | Laporan jumlah surat per tahun atau bulan, per jenis dan per status, siap dicetak |
| **Jenis & Kode Surat** | Mengelola kode klasifikasi surat yang dipakai dalam penomoran |
| **Pengguna** | Mengelola peran pengguna (Guru/Staf, Admin Tata Usaha, Kepala Sekolah) |
| **Riwayat Surat** | Setiap perubahan status tercatat dan ditampilkan sebagai linimasa pada detail surat |
| **Dashboard** | Ringkasan statistik dan aktivitas surat terbaru sesuai peran pengguna |

### Format nomor surat

```
KODE KLASIFIKASI / NOMOR URUT / KODE SEKOLAH / BULAN (ROMAWI) / TAHUN
        005      /    001     /   SMKN1SDY   /       X        / 2026
```

- Nomor urut berlanjut sepanjang tahun untuk semua jenis surat dan kembali ke `001` setiap tahun baru.
- Nomor surat masuk (agenda) memakai format `NOMOR/SM/TAHUN`, contoh `001/SM/2026`.
- Kode sekolah diatur di `backend/helpers.php` (konstanta `KODE_SEKOLAH`).

## Peran Pengguna (RBAC)

SICAF menerapkan **Role Based Access Control** dengan tiga peran:

| Peran | Hak akses |
|---|---|
| **Guru / Staf** (`user`) | Ambil nomor surat, kelola surat miliknya, lihat arsip surat miliknya |
| **Admin Tata Usaha** (`admin`) | Semua hak Guru/Staf, verifikasi surat, arsip surat keluar dan masuk, rekap, jenis surat, kelola pengguna |
| **Kepala Sekolah** (`kepsek`) | Persetujuan surat, arsip surat keluar dan masuk, rekap |

Registrasi mandiri selalu terdaftar sebagai Guru/Staf. Peran Admin dan Kepala Sekolah diberikan
oleh Admin melalui menu Pengguna.

## Tech Stack

| Lapisan | Teknologi | Fungsi |
|---|---|---|
| Antarmuka (frontend) | HTML5, CSS3, JavaScript (native, tanpa framework) | Tampilan dan interaksi pengguna |
| Library antarmuka | SweetAlert2, Remix Icon, Google Fonts (Plus Jakarta Sans) | Dialog konfirmasi, ikon, dan huruf |
| Server (backend) | PHP 8 (native, tanpa framework) | Logika bisnis dan API |
| Akses basis data | Ekstensi `mysqli` dengan *prepared statement* | Query aman dari SQL injection |
| Basis data | MySQL / MariaDB | Penyimpanan data pengguna, surat, dan riwayat |
| Web server | Apache (XAMPP) atau Nginx | Menyajikan aplikasi |
| Autentikasi | Session PHP dan `password_hash` (bcrypt) | Login dan penyimpanan password yang aman |
| Penyimpanan dokumen | Folder server `uploads/` (opsional: Google Drive melalui Google Apps Script) | Menyimpan file PDF/DOC/DOCX |
| Metode pengembangan | SDLC model Waterfall | Analisis, perancangan, implementasi, pengujian |

**Alasan pemilihan:** tanpa framework sehingga ringan, mudah dipasang di hosting atau VPS biasa,
dan alur programnya mudah dipahami serta dirawat untuk skala sekolah.

## Cara Kerja Sistem

### Arsitektur

SICAF memakai arsitektur **client–server** dengan komunikasi **API berformat JSON**.

```
┌──────────────────────────┐   fetch() + JSON    ┌──────────────────────────┐   SQL    ┌─────────────┐
│  Browser                 │ ──────────────────► │  Backend PHP             │ ───────► │  MySQL /    │
│  HTML + CSS + JavaScript │ ◄────────────────── │  (folder backend/)       │ ◄─────── │  MariaDB    │
│  (login.html, app.html)  │    respons JSON     │  cek sesi & peran (RBAC) │          └─────────────┘
└──────────────────────────┘                     │                          │  file    ┌─────────────┐
                                                 │                          │ ───────► │  uploads/   │
                                                 └──────────────────────────┘          └─────────────┘
```

1. Pengguna membuka halaman di browser. Setelah login, seluruh menu berada di satu halaman
   (`app.html`), sehingga berpindah menu tidak memuat ulang halaman.
2. JavaScript (`js/app.js`) meminta data ke backend menggunakan `fetch()`, misalnya
   `backend/surat-list.php?scope=arsip`.
3. Backend memeriksa sesi login dan peran pengguna, menjalankan query ke basis data, lalu
   mengembalikan hasil dalam bentuk JSON.
4. JavaScript menampilkan data tersebut sebagai tabel, kartu statistik, atau detail surat.

### Alur pengajuan hingga arsip

```
 Guru/Staf                     Tata Usaha                  Kepala Sekolah
 ─────────                     ──────────                  ──────────────
 Isi data + unggah dokumen
 → nomor surat terbit
 → Menunggu Verifikasi TU ───► Periksa surat
                               ├─ Teruskan ──────────────► Tinjau surat
                               │                           ├─ Setujui  → Disetujui → ARSIP
                               │                           ├─ Revisi   → Perlu Revisi (Kepsek)
                               │                           └─ Tolak    → Ditolak
                               └─ Kembalikan → Perlu Revisi (TU)
 Perbaiki surat ◄──────────────────────────────────────────┘
 → kembali ke Menunggu Verifikasi TU
```

Setiap tindakan disimpan di tabel `surat_logs`, sehingga riwayat lengkap setiap surat dapat
ditelusuri. Backend juga memeriksa status saat ini sebelum memproses aksi, misalnya surat tidak dapat
disetujui sebelum diverifikasi Tata Usaha.

### Penomoran otomatis tanpa nomor ganda

Saat surat diajukan, backend:

1. Mengunci proses penomoran dengan `GET_LOCK` di MySQL, sehingga dua pengajuan pada saat yang sama
   diproses bergantian.
2. Mengambil nomor urut terakhir pada tahun berjalan, lalu menambahkan 1.
3. Menyusun nomor surat sesuai format sekolah dan menyimpannya.
4. Melepas kunci.

Sebagai pengaman terakhir, kolom `kode_surat` dan pasangan `(tahun, nomor_urut)` bersifat `UNIQUE`
di basis data. Nomor, jenis, dan tanggal surat tidak dapat diubah setelah nomor terbit.

### Penyimpanan dokumen

- Dokumen (PDF, DOC, DOCX, maks. 10 MB) disimpan di folder `uploads/` dengan nama acak ditambah
  nomor surat, misalnya `a1b2c3d4_005-001-SMKN1SDY-X-2026.pdf`.
- Dokumen hanya dapat dibuka melalui `backend/file.php` setelah login. Guru/Staf hanya dapat membuka
  dokumen suratnya sendiri, sedangkan surat masuk hanya untuk Admin dan Kepala Sekolah.
- Opsional: bila `backend/google-drive-config.php` diisi, dokumen otomatis diunggah ke Google Drive
  melalui Web App Google Apps Script (`backend/google-apps-script.example.gs`).

### Keamanan

- Password disimpan sebagai hash bcrypt, tidak pernah dalam bentuk asli.
- Semua query memakai *prepared statement* untuk mencegah SQL injection.
- Hak akses diperiksa ulang di setiap endpoint backend, tidak hanya dengan menyembunyikan menu.
- Peran pengguna dibaca ulang dari basis data setiap permintaan, sehingga perubahan peran langsung berlaku.
- Cookie sesi bersifat `HttpOnly` dan `SameSite=Lax`.
- Tipe dan ukuran file unggahan divalidasi di server.

## Struktur Basis Data

| Tabel | Isi |
|---|---|
| `users` | Data pengguna: nama, NIP, jabatan, email, password (hash), peran |
| `jenis_surat` | Kode klasifikasi dan nama jenis surat |
| `surat` | Surat keluar: nomor, perihal, tujuan, tanggal, ringkasan, dokumen, status, catatan |
| `surat_logs` | Riwayat setiap tindakan pada surat keluar |
| `surat_masuk` | Surat masuk: nomor agenda, asal, nomor surat asal, perihal, tanggal, dokumen |

```
users 1──* surat *──1 jenis_surat
users 1──* surat_logs *──1 surat
users 1──* surat_masuk
```

Struktur lengkap dan data awal ada di file `db.sql`.

## Struktur Folder

```
sicaf/
├── index.html              Halaman awal (mengarahkan ke login)
├── login.html              Halaman masuk
├── registrasi.html         Halaman pendaftaran akun
├── app.html                Halaman aplikasi (semua menu)
├── css/style.css           Tampilan
├── js/
│   ├── api.js              Fungsi bersama: pemanggilan API, label status, format tanggal
│   ├── auth.js             Logika login dan registrasi
│   └── app.js              Logika seluruh menu aplikasi
├── backend/
│   ├── helpers.php         Fungsi bersama: sesi, RBAC, penomoran, unggah dokumen
│   ├── db.php              Koneksi basis data
│   ├── login.php, logout.php, register.php, me.php
│   ├── dashboard.php       Data dashboard
│   ├── surat-preview.php   Pratinjau nomor surat
│   ├── surat-create.php    Pengajuan surat dan penerbitan nomor
│   ├── surat-update.php    Ubah atau perbaiki surat
│   ├── surat-delete.php    Hapus surat
│   ├── surat-action.php    Verifikasi dan persetujuan
│   ├── surat-list.php      Daftar surat
│   ├── surat-detail.php    Detail dan riwayat surat
│   ├── surat-masuk.php     Surat masuk
│   ├── jenis-surat.php     Jenis dan kode surat
│   ├── pengguna.php        Kelola pengguna
│   └── file.php            Membuka dokumen dengan pengecekan hak akses
├── assets/img/             Logo
├── uploads/                Dokumen tersimpan (dilindungi .htaccess)
├── tests/uji-alur.sh       Skrip pengujian black box
└── db.sql                  Struktur basis data dan data awal
```

## Instalasi dan Menjalankan

### Kebutuhan

- XAMPP (Apache, PHP 8, MySQL/MariaDB)
- Browser modern (Chrome, Edge, Firefox)

### Langkah

1. Jalankan **Apache** dan **MySQL** dari XAMPP Control Panel.
2. Salin folder `sicaf` ke `C:\xampp\htdocs\sicaf`.
3. Impor basis data melalui phpMyAdmin (`http://localhost/phpmyadmin`, tab **Import**, pilih `db.sql`),
   atau melalui terminal:
   ```bash
   C:\xampp\mysql\bin\mysql.exe -u root < db.sql
   ```
4. Sesuaikan kredensial basis data di `backend/db.php` bila berbeda dari bawaan XAMPP.
5. Buka **http://localhost/sicaf/**.

Alternatif tanpa Apache (server bawaan PHP):

```bash
C:\xampp\php\php.exe -S localhost:8090 -t sicaf
```

lalu buka `http://localhost:8090`.

### Akun demo

Password semua akun: `password123`

| Email | Peran |
|---|---|
| `guru@sicaf.test` | Guru / Staf |
| `tu@sicaf.test` | Admin Tata Usaha |
| `kepsek@sicaf.test` | Kepala Sekolah |

> Ganti atau hapus akun demo sebelum sistem dipakai di server produksi.

## Pengujian (Black Box)

Pengujian dilakukan dengan metode **Black Box Testing**, yaitu memberi masukan pada sistem dan
memeriksa apakah keluarannya sesuai harapan tanpa melihat kode program.

Skrip `tests/uji-alur.sh` menjalankan 18 skenario uji secara otomatis melalui API. Jalankan pada
basis data yang baru diimpor:

```bash
bash tests/uji-alur.sh http://localhost:8090
```

| No | Skenario | Hasil yang diharapkan |
|:--:|---|---|
| 1 | Login dengan password salah | Ditolak |
| 2–4 | Login Guru, Tata Usaha, Kepala Sekolah | Berhasil masuk |
| 5 | Pengajuan surat | Nomor surat terbit otomatis |
| 6 | Dua pengajuan berturut-turut | Nomor berbeda (tidak ganda) |
| 7 | Kepala Sekolah menyetujui surat yang belum diverifikasi | Ditolak |
| 8 | Revisi tanpa catatan | Ditolak |
| 9 | Tata Usaha mengembalikan surat untuk revisi | Status menjadi Perlu Revisi |
| 10 | Guru mengirim perbaikan | Status kembali ke Menunggu Verifikasi |
| 11 | Tata Usaha meneruskan surat | Status Menunggu Persetujuan Kepsek |
| 12 | Guru menghapus surat yang sedang diproses Kepsek | Ditolak |
| 13 | Kepala Sekolah menyetujui surat | Status Disetujui |
| 14 | Surat disetujui | Tampil di arsip |
| 15 | Membuka detail surat | Riwayat tercatat lengkap |
| 16 | Guru membuka daftar pengguna | Ditolak (bukan Admin) |
| 17 | Registrasi dengan peran admin | Akun tetap terdaftar sebagai Guru/Staf |
| 18 | Unggah file selain PDF/DOC/DOCX | Ditolak |

---

<p align="center">&copy; 2026 Kelompok SICAF &middot; Universitas Terbuka</p>
