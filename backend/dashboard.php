<?php

require_once __DIR__ . "/db.php";

$user = requireUser();
$isUser = $user["role"] === "user";
$tahun = (int)date("Y");

$where = $isUser ? "WHERE surat.user_id = ?" : "";
$types = $isUser ? "i" : "";
$params = $isUser ? [$user["id"]] : [];

$statusCounts = array_fill_keys(
    ["dikirim_admin", "revisi_admin", "diteruskan_kepsek", "revisi_kepsek", "ditolak_kepsek", "disetujui"],
    0
);

foreach (dbAll($conn, "SELECT status, COUNT(*) AS jumlah FROM surat $where GROUP BY status", $types, $params) as $row) {
    $statusCounts[$row["status"]] = (int)$row["jumlah"];
}

$terbaru = dbAll(
    $conn,
    "SELECT surat.id, surat.kode_surat, surat.judul_surat, surat.tanggal_surat, surat.status, users.nama_lengkap AS nama_pengaju
     FROM surat JOIN users ON users.id = surat.user_id
     $where
     ORDER BY surat.updated_at DESC, surat.id DESC
     LIMIT 5",
    $types,
    $params
);

$suratMasuk = null;
if ($user["role"] !== "user") {
    $suratMasuk = (int)dbOne($conn, "SELECT COUNT(*) AS jumlah FROM surat_masuk WHERE tahun = ?", "i", [$tahun])["jumlah"];
}

$totalPengguna = null;
if ($user["role"] === "admin") {
    $totalPengguna = (int)dbOne($conn, "SELECT COUNT(*) AS jumlah FROM users")["jumlah"];
}

jsonResponse(200, [
    "status_counts" => $statusCounts,
    "surat_masuk_tahun_ini" => $suratMasuk,
    "total_pengguna" => $totalPengguna,
    "terbaru" => $terbaru,
]);
