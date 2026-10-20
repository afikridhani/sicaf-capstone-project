<?php

require_once __DIR__ . "/db.php";

$user = requireUser(["user", "admin"]);
$input = readJsonInput();
$suratId = (int)($input["surat_id"] ?? 0);

$surat = dbOne($conn, "SELECT * FROM surat WHERE id = ?", "i", [$suratId]);

if (!$surat) {
    jsonResponse(404, ["message" => "Surat tidak ditemukan"]);
}

// Admin boleh menghapus semua surat; pengaju hanya surat miliknya yang belum di tangan Kepala Sekolah atau disetujui
if ($user["role"] !== "admin") {
    if ((int)$surat["user_id"] !== $user["id"]) {
        jsonResponse(403, ["message" => "Anda hanya dapat menghapus surat milik sendiri"]);
    }

    if (in_array($surat["status"], ["diteruskan_kepsek", "disetujui"], true)) {
        jsonResponse(409, ["message" => "Surat yang sedang diproses Kepala Sekolah atau sudah disetujui tidak dapat dihapus"]);
    }
}

dbRun($conn, "DELETE FROM surat WHERE id = ?", "i", [$suratId]);
deleteStoredFile($surat["file_ref"]);

jsonResponse(200, ["message" => "Surat {$surat["kode_surat"]} dihapus"]);
