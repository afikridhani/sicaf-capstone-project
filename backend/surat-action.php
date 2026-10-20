<?php

require_once __DIR__ . "/db.php";

$user = requireUser(["admin", "kepsek"]);
$input = readJsonInput();

$suratId = (int)($input["surat_id"] ?? 0);
$action = $input["action"] ?? "";
$catatan = trim($input["catatan"] ?? "");

// Alur persetujuan: siapa yang boleh, dari status apa, ke status apa
$transitions = [
    "teruskan" => ["role" => "admin", "from" => "dikirim_admin", "to" => "diteruskan_kepsek", "wajib_catatan" => false, "aksi" => "Memverifikasi dan meneruskan surat ke Kepala Sekolah"],
    "revisi_admin" => ["role" => "admin", "from" => "dikirim_admin", "to" => "revisi_admin", "wajib_catatan" => true, "aksi" => "Mengembalikan surat untuk diperbaiki"],
    "setujui" => ["role" => "kepsek", "from" => "diteruskan_kepsek", "to" => "disetujui", "wajib_catatan" => false, "aksi" => "Menyetujui surat"],
    "revisi_kepsek" => ["role" => "kepsek", "from" => "diteruskan_kepsek", "to" => "revisi_kepsek", "wajib_catatan" => true, "aksi" => "Mengembalikan surat untuk diperbaiki"],
    "tolak" => ["role" => "kepsek", "from" => "diteruskan_kepsek", "to" => "ditolak_kepsek", "wajib_catatan" => true, "aksi" => "Menolak surat"],
];

$rule = $transitions[$action] ?? null;

if (!$rule) {
    jsonResponse(400, ["message" => "Aksi tidak valid"]);
}

if ($rule["role"] !== $user["role"]) {
    jsonResponse(403, ["message" => "Anda tidak memiliki akses untuk aksi ini"]);
}

if ($rule["wajib_catatan"] && $catatan === "") {
    jsonResponse(400, ["message" => "Catatan wajib diisi"]);
}

$catatanDb = $catatan === "" ? null : $catatan;

// Syarat status lama di WHERE mencegah surat diproses dua kali
$updated = dbRun(
    $conn,
    "UPDATE surat SET status = ?, catatan = ? WHERE id = ? AND status = ?",
    "ssis",
    [$rule["to"], $catatanDb, $suratId, $rule["from"]]
);

if ($updated === 0) {
    jsonResponse(409, ["message" => "Surat tidak ditemukan atau statusnya sudah berubah. Muat ulang halaman."]);
}

logSurat($conn, $suratId, $user["id"], $rule["aksi"], $rule["from"], $rule["to"], $catatanDb);

jsonResponse(200, ["message" => "Status surat diperbarui", "status" => $rule["to"]]);
