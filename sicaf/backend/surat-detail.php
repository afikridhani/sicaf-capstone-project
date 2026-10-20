<?php

require_once __DIR__ . "/db.php";

$user = requireUser();
$suratId = (int)($_GET["id"] ?? 0);

$surat = dbOne(
    $conn,
    "SELECT surat.id, surat.user_id, surat.kode_surat, surat.judul_surat, surat.tujuan, surat.tanggal_surat, surat.isi_ringkas,
            surat.file_url, surat.file_name, surat.status, surat.catatan, surat.created_at, surat.updated_at,
            users.nama_lengkap AS nama_pengaju, users.jabatan AS jabatan_pengaju,
            jenis_surat.kode AS kode_jenis, jenis_surat.nama_jenis
     FROM surat
     JOIN users ON users.id = surat.user_id
     JOIN jenis_surat ON jenis_surat.id = surat.jenis_surat_id
     WHERE surat.id = ?",
    "i",
    [$suratId]
);

if (!$surat || ($user["role"] === "user" && (int)$surat["user_id"] !== $user["id"])) {
    jsonResponse(404, ["message" => "Surat tidak ditemukan"]);
}

$riwayat = dbAll(
    $conn,
    "SELECT surat_logs.aksi, surat_logs.status_sebelum, surat_logs.status_sesudah, surat_logs.catatan, surat_logs.created_at,
            users.nama_lengkap, users.role
     FROM surat_logs JOIN users ON users.id = surat_logs.user_id
     WHERE surat_logs.surat_id = ?
     ORDER BY surat_logs.created_at, surat_logs.id",
    "i",
    [$suratId]
);

jsonResponse(200, ["data" => $surat, "riwayat" => $riwayat]);
