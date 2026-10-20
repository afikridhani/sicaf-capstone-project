<?php

require_once __DIR__ . "/db.php";

$user = requireUser(["user", "admin"]);

$jenisSuratId = (int)($_POST["jenis_surat_id"] ?? 0);
$judulSurat = trim($_POST["judul_surat"] ?? "");
$tujuan = trim($_POST["tujuan"] ?? "");
$tanggalSurat = $_POST["tanggal_surat"] ?? "";
$isiRingkas = trim($_POST["isi_ringkas"] ?? "");

if ($judulSurat === "" || $tujuan === "" || $isiRingkas === "" || !isValidDate($tanggalSurat)) {
    jsonResponse(400, ["message" => "Jenis, tanggal, perihal, tujuan, dan ringkasan surat wajib diisi"]);
}

if (mb_strlen($judulSurat) > 255 || mb_strlen($tujuan) > 150) {
    jsonResponse(400, ["message" => "Perihal maks. 255 karakter dan tujuan maks. 150 karakter"]);
}

$jenis = dbOne($conn, "SELECT id, kode FROM jenis_surat WHERE id = ?", "i", [$jenisSuratId]);

if (!$jenis) {
    jsonResponse(404, ["message" => "Jenis surat tidak ditemukan"]);
}

$file = validateUpload("file", true);
$tahun = (int)substr($tanggalSurat, 0, 4);
$status = "dikirim_admin";

// Nomor diambil dan disimpan di dalam kunci agar tidak ada dua surat dengan nomor yang sama
list($suratId, $kodeSurat) = withLock($conn, "sicaf_nomor_surat_keluar", function () use ($conn, $user, $jenis, $tahun, $judulSurat, $tujuan, $tanggalSurat, $isiRingkas, $status) {
    $nomorUrut = nextNomorUrut($conn, "surat", "nomor_urut", $tahun);
    $kodeSurat = buildNomorSurat($jenis["kode"], $nomorUrut, $tanggalSurat)["kode_surat"];

    dbRun(
        $conn,
        "INSERT INTO surat (user_id, jenis_surat_id, tahun, nomor_urut, kode_surat, judul_surat, tujuan, tanggal_surat, isi_ringkas, file_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)",
        "iiiissssss",
        [$user["id"], $jenis["id"], $tahun, $nomorUrut, $kodeSurat, $judulSurat, $tujuan, $tanggalSurat, $isiRingkas, $status]
    );

    return [mysqli_insert_id($conn), $kodeSurat];
});

list($stored, $error) = storeFile($file, $kodeSurat);

if ($error !== null) {
    dbRun($conn, "DELETE FROM surat WHERE id = ?", "i", [$suratId]);
    jsonResponse(400, ["message" => $error]);
}

dbRun(
    $conn,
    "UPDATE surat SET file_url = ?, file_name = ?, file_ref = ? WHERE id = ?",
    "sssi",
    [$stored["url"], $stored["name"], $stored["ref"], $suratId]
);

logSurat($conn, $suratId, $user["id"], "Mengajukan surat dan menerima nomor $kodeSurat", null, $status);

jsonResponse(201, [
    "message" => "Surat berhasil diajukan",
    "data" => ["id" => $suratId, "kode_surat" => $kodeSurat, "status" => $status],
]);
