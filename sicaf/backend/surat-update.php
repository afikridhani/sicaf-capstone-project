<?php

require_once __DIR__ . "/db.php";

$user = requireUser(["user", "admin"]);

$suratId = (int)($_POST["surat_id"] ?? 0);
$judulSurat = trim($_POST["judul_surat"] ?? "");
$tujuan = trim($_POST["tujuan"] ?? "");
$isiRingkas = trim($_POST["isi_ringkas"] ?? "");

if ($judulSurat === "" || $tujuan === "" || $isiRingkas === "") {
    jsonResponse(400, ["message" => "Perihal, tujuan, dan ringkasan surat wajib diisi"]);
}

if (mb_strlen($judulSurat) > 255 || mb_strlen($tujuan) > 150) {
    jsonResponse(400, ["message" => "Perihal maks. 255 karakter dan tujuan maks. 150 karakter"]);
}

$surat = dbOne($conn, "SELECT * FROM surat WHERE id = ? AND user_id = ?", "ii", [$suratId, $user["id"]]);

if (!$surat) {
    jsonResponse(404, ["message" => "Surat tidak ditemukan"]);
}

// Nomor, jenis, dan tanggal sudah terkunci sejak nomor diterbitkan, jadi tidak ikut diubah
if (!in_array($surat["status"], ["dikirim_admin", "revisi_admin", "revisi_kepsek"], true)) {
    jsonResponse(409, ["message" => "Surat yang sedang diproses Kepala Sekolah atau sudah selesai tidak dapat diubah"]);
}

$isRevisi = str_starts_with($surat["status"], "revisi_");
$statusBaru = $isRevisi ? "dikirim_admin" : $surat["status"];
$file = validateUpload("file", false);
$stored = null;

if ($file) {
    list($stored, $error) = storeFile($file, $surat["kode_surat"]);
    if ($error !== null) {
        jsonResponse(400, ["message" => $error]);
    }
}

dbRun(
    $conn,
    "UPDATE surat
     SET judul_surat = ?, tujuan = ?, isi_ringkas = ?, file_url = ?, file_name = ?, file_ref = ?, status = ?,
         catatan = IF(? = 1, NULL, catatan)
     WHERE id = ?",
    "sssssssii",
    [
        $judulSurat,
        $tujuan,
        $isiRingkas,
        $stored["url"] ?? $surat["file_url"],
        $stored["name"] ?? $surat["file_name"],
        $stored["ref"] ?? $surat["file_ref"],
        $statusBaru,
        $isRevisi ? 1 : 0,
        $suratId,
    ]
);

if ($stored) {
    deleteStoredFile($surat["file_ref"]);
}

logSurat(
    $conn,
    $suratId,
    $user["id"],
    $isRevisi ? "Mengirim perbaikan surat ke Tata Usaha" : "Mengubah data surat",
    $surat["status"],
    $statusBaru
);

jsonResponse(200, ["message" => $isRevisi ? "Perbaikan surat dikirim ke Tata Usaha" : "Data surat diperbarui"]);
