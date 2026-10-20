<?php

require_once __DIR__ . "/db.php";

$user = requireUser();
$scope = $_GET["scope"] ?? "";

// scope => [peran yang boleh, kondisi WHERE]
$scopes = [
    "mine" => [["user", "admin"], "surat.user_id = ?"],
    "verifikasi" => [["admin"], "surat.status = 'dikirim_admin'"],
    "persetujuan" => [["kepsek"], "surat.status = 'diteruskan_kepsek'"],
    "arsip" => [ROLES, $user["role"] === "user" ? "surat.status = 'disetujui' AND surat.user_id = ?" : "surat.status = 'disetujui'"],
    "semua" => [["admin", "kepsek"], "1 = 1"],
];

if (!isset($scopes[$scope])) {
    jsonResponse(400, ["message" => "Jenis daftar surat tidak valid"]);
}

list($roles, $where) = $scopes[$scope];

if (!in_array($user["role"], $roles, true)) {
    jsonResponse(403, ["message" => "Anda tidak memiliki akses ke daftar ini"]);
}

$needsUserId = str_contains($where, "?");

$rows = dbAll(
    $conn,
    "SELECT surat.id, surat.user_id, surat.jenis_surat_id, surat.tahun, surat.nomor_urut, surat.kode_surat, surat.judul_surat,
            surat.tujuan, surat.tanggal_surat, surat.isi_ringkas, surat.file_url, surat.file_name, surat.status, surat.catatan,
            surat.created_at, surat.updated_at,
            users.nama_lengkap AS nama_pengaju, users.jabatan AS jabatan_pengaju,
            jenis_surat.kode AS kode_jenis, jenis_surat.nama_jenis
     FROM surat
     JOIN users ON users.id = surat.user_id
     JOIN jenis_surat ON jenis_surat.id = surat.jenis_surat_id
     WHERE $where
     ORDER BY surat.tahun DESC, surat.nomor_urut DESC",
    $needsUserId ? "i" : "",
    $needsUserId ? [$user["id"]] : []
);

jsonResponse(200, ["data" => $rows]);
