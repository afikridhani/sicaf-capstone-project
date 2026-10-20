-- SICAF - Sistem Informasi Cakap Arsip dan Persuratan
-- SMK Negeri 1 Sedayu

CREATE DATABASE IF NOT EXISTS sicaf CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sicaf;

-- Pengguna dengan tiga peran (RBAC): user = Guru/Staf, admin = Tata Usaha, kepsek = Kepala Sekolah
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    nip VARCHAR(30) NULL,
    jabatan VARCHAR(100) NOT NULL,
    jenis_kelamin ENUM('male', 'female') NOT NULL,
    role ENUM('user', 'admin', 'kepsek') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Kode klasifikasi surat yang dipakai dalam penomoran
CREATE TABLE IF NOT EXISTS jenis_surat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(20) NOT NULL UNIQUE,
    nama_jenis VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Surat keluar: diajukan, diverifikasi TU, disetujui Kepala Sekolah, lalu menjadi arsip
CREATE TABLE IF NOT EXISTS surat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    jenis_surat_id INT NOT NULL,
    tahun SMALLINT NOT NULL,
    nomor_urut INT NOT NULL,
    kode_surat VARCHAR(100) NOT NULL UNIQUE,
    judul_surat VARCHAR(255) NOT NULL,
    tujuan VARCHAR(150) NOT NULL,
    tanggal_surat DATE NOT NULL,
    isi_ringkas TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL DEFAULT '',
    file_ref VARCHAR(255) NOT NULL DEFAULT '',
    status ENUM(
        'dikirim_admin',
        'revisi_admin',
        'diteruskan_kepsek',
        'revisi_kepsek',
        'ditolak_kepsek',
        'disetujui'
    ) NOT NULL DEFAULT 'dikirim_admin',
    catatan TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Nomor urut unik per tahun: jaminan terakhir agar tidak ada nomor surat ganda
    UNIQUE KEY uq_surat_nomor (tahun, nomor_urut),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (jenis_surat_id) REFERENCES jenis_surat(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Riwayat (jejak audit) setiap perubahan pada surat keluar
CREATE TABLE IF NOT EXISTS surat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    surat_id INT NOT NULL,
    user_id INT NOT NULL,
    aksi VARCHAR(150) NOT NULL,
    status_sebelum VARCHAR(50) NULL,
    status_sesudah VARCHAR(50) NULL,
    catatan TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (surat_id) REFERENCES surat(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Surat masuk: dicatat Tata Usaha dengan nomor agenda otomatis
CREATE TABLE IF NOT EXISTS surat_masuk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tahun SMALLINT NOT NULL,
    nomor_agenda INT NOT NULL,
    kode_agenda VARCHAR(50) NOT NULL UNIQUE,
    nomor_surat_asal VARCHAR(100) NOT NULL,
    asal_surat VARCHAR(150) NOT NULL,
    perihal VARCHAR(255) NOT NULL,
    tanggal_surat DATE NOT NULL,
    tanggal_terima DATE NOT NULL,
    keterangan TEXT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL DEFAULT '',
    file_ref VARCHAR(255) NOT NULL DEFAULT '',
    dicatat_oleh INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_agenda (tahun, nomor_agenda),
    FOREIGN KEY (dicatat_oleh) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Contoh kode klasifikasi; sesuaikan dengan pedoman klasifikasi arsip sekolah
INSERT IGNORE INTO jenis_surat (kode, nama_jenis) VALUES
('005', 'Surat Undangan'),
('094', 'Surat Tugas / Perjalanan Dinas'),
('421.5', 'Surat Keterangan Siswa'),
('800', 'Surat Kepegawaian');

-- Akun demo, password semua akun: password123
INSERT IGNORE INTO users (email, password, nama_lengkap, nip, jabatan, jenis_kelamin, role) VALUES
('guru@sicaf.test', '$2y$10$90UPj00k6iEciPBqPrwNBOQP6/ovxoYScLSWO7gWE3NdEqH6tcw3O', 'Guru Demo', NULL, 'Guru Produktif', 'female', 'user'),
('tu@sicaf.test', '$2y$10$90UPj00k6iEciPBqPrwNBOQP6/ovxoYScLSWO7gWE3NdEqH6tcw3O', 'Petugas Tata Usaha', NULL, 'Staf Tata Usaha', 'male', 'admin'),
('kepsek@sicaf.test', '$2y$10$90UPj00k6iEciPBqPrwNBOQP6/ovxoYScLSWO7gWE3NdEqH6tcw3O', 'Kepala Sekolah', NULL, 'Kepala Sekolah', 'male', 'kepsek');
