# SICAF - Sistem Informasi Cakap Arsip dan Persuratan

Sistem informasi penomoran dan pengarsipan dokumen digital untuk **SMK Negeri 1 Sedayu**.
Capstone Project STSI4440, Program Studi Sistem Informasi, Universitas Terbuka.

SICAF dikembangkan dari prototipe Zefis dan disesuaikan dengan proposal penelitian
"Sistem Informasi Penomoran dan Pengarsipan Dokumen Digital pada SMKN 1 Sedayu".

## Fitur dan kaitannya dengan proposal

| Ruang lingkup / tujuan proposal | Fitur di SICAF |
|---|---|
| Penomoran surat otomatis, tidak ada nomor ganda | Menu **Ambil Nomor Surat**: nomor diterbitkan sistem, dikunci di database (`GET_LOCK` + `UNIQUE`) |
| Format penomoran sesuai sekolah | `KODE/NOMOR URUT/SMKN1SDY/BULAN ROMAWI/TAHUN`, contoh `005/001/SMKN1SDY/X/2026` |
| Penambahan, penyimpanan, pengubahan, penghapusan data dokumen | Ajukan, ubah, perbaiki, dan hapus surat; kelola surat masuk; kelola jenis surat |
| Unggah, pencarian, pengelolaan dokumen berdasarkan nomor, jenis, tanggal | **Arsip Surat Keluar** dan **Arsip Surat Masuk** dengan filter kata kunci, jenis, dan rentang tanggal |
| Role Based Access Control (User, Admin, Kepala Sekolah) | Menu dan hak akses berbeda per peran, diperiksa ulang di setiap endpoint backend |
| Verifikasi admin dan persetujuan Kepala Sekolah | Menu **Verifikasi Surat** (TU) dan **Persetujuan Surat** (Kepsek), dengan catatan revisi/penolakan |
| Pelaporan data persuratan | Menu **Rekap Persuratan** per tahun/bulan dan tombol **Cetak Laporan** |
| Riwayat surat | Setiap perubahan status tercatat dan tampil sebagai linimasa di detail surat |

## Peran pengguna

| Peran | Hak akses |
|---|---|
| Guru / Staf (`user`) | Ambil nomor surat, Surat Saya (ubah, perbaiki, hapus), Arsip surat miliknya |
| Admin Tata Usaha (`admin`) | Semua fitur User + verifikasi surat, arsip surat keluar & masuk, rekap, jenis surat, pengguna |
| Kepala Sekolah (`kepsek`) | Persetujuan surat, arsip surat keluar & masuk, rekap |

Registrasi mandiri selalu menjadi **Guru / Staf**. Peran Admin dan Kepala Sekolah diatur oleh Admin di menu Pengguna.

## Alur status surat keluar

```
Diajukan (nomor terbit) -> Menunggu Verifikasi TU
   TU: Teruskan            -> Menunggu Persetujuan Kepsek
   TU: Kembalikan          -> Perlu Revisi (TU)     -> Guru memperbaiki -> Menunggu Verifikasi TU
Kepsek: Setujui            -> Disetujui (masuk arsip)
Kepsek: Minta Revisi       -> Perlu Revisi (Kepsek) -> Guru memperbaiki -> Menunggu Verifikasi TU
Kepsek: Tolak              -> Ditolak (selesai)
```

Nomor, jenis, dan tanggal surat tidak dapat diubah setelah nomor terbit. Nomor urut berlanjut sepanjang tahun dan kembali ke 001 setiap tahun baru.

## Cara menjalankan (XAMPP)

1. Jalankan **Apache** dan **MySQL** dari XAMPP Control Panel.
2. Salin folder `sicaf` ke `C:\xampp\htdocs\sicaf`.
3. Impor database: buka phpMyAdmin, pilih tab **Import**, lalu pilih file `db.sql`
   (atau jalankan `C:\xampp\mysql\bin\mysql.exe -u root < db.sql`).
4. Sesuaikan koneksi di `backend/db.php` bila user/password MySQL berbeda.
5. Buka `http://localhost/sicaf/`.

Alternatif tanpa Apache: `C:\xampp\php\php.exe -S localhost:8090 -t sicaf` lalu buka `http://localhost:8090`.

### Akun demo

Password semua akun: `password123`

| Email | Peran |
|---|---|
| guru@sicaf.test | Guru / Staf |
| tu@sicaf.test | Admin Tata Usaha |
| kepsek@sicaf.test | Kepala Sekolah |

## Penyimpanan dokumen

- **Bawaan:** dokumen disimpan di folder `uploads/` dan hanya bisa dibuka lewat `backend/file.php`
  setelah login (Guru hanya bisa membuka dokumen suratnya sendiri).
- **Opsional, Google Drive:** salin `backend/google-drive-config.example.php` menjadi
  `backend/google-drive-config.php`, lalu isi `web_app_url` dan `shared_secret` dari Web App
  Google Apps Script (`backend/google-apps-script.example.gs`, deploy: Execute as *Me*, Who has access *Anyone*).
  Jika file konfigurasi ada, dokumen otomatis diunggah ke Drive dengan nama sesuai nomor surat.

## Pengujian (Black Box)

Skrip `tests/uji-alur.sh` menguji 18 skenario utama lewat API (login, penomoran, nomor tidak ganda,
verifikasi, revisi, persetujuan, arsip, riwayat, hak akses, validasi file). Jalankan pada database
yang baru diimpor:

```bash
bash tests/uji-alur.sh http://localhost:8090
```

## Struktur folder

```
sicaf/
├── index.html, login.html, registrasi.html, app.html   Halaman antarmuka
├── css/style.css                                       Tampilan
├── js/api.js, js/auth.js, js/app.js                    Logika antarmuka
├── backend/                                            Endpoint PHP (JSON)
│   ├── helpers.php        Fungsi bersama: sesi, RBAC, penomoran, upload
│   ├── db.php             Koneksi database
│   ├── surat-*.php        Surat keluar (ajukan, ubah, hapus, aksi, daftar, detail, pratinjau nomor)
│   ├── surat-masuk.php    Surat masuk
│   ├── jenis-surat.php    Jenis & kode surat
│   ├── pengguna.php       Kelola pengguna
│   └── file.php           Membuka dokumen dengan pengecekan hak akses
├── uploads/               Dokumen tersimpan (dilindungi .htaccess)
├── tests/uji-alur.sh      Uji black box
└── db.sql                 Struktur database + data awal
```
