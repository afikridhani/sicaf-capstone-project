<?php

require_once __DIR__ . "/db.php";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    requireUser(["admin", "kepsek"]);

    $rows = dbAll(
        $conn,
        "SELECT surat_masuk.id, surat_masuk.tahun, surat_masuk.nomor_agenda, surat_masuk.kode_agenda, surat_masuk.nomor_surat_asal,
                surat_masuk.asal_surat, surat_masuk.perihal, surat_masuk.tanggal_surat, surat_masuk.tanggal_terima,
                surat_masuk.keterangan, surat_masuk.file_url, surat_masuk.file_name, surat_masuk.created_at,
                users.nama_lengkap AS nama_pencatat
         FROM surat_masuk JOIN users ON users.id = surat_masuk.dicatat_oleh
         ORDER BY surat_masuk.tahun DESC, surat_masuk.nomor_agenda DESC"
    );

    jsonResponse(200, ["data" => $rows]);
}

$user = requireUser(["admin"]);
$input = $_POST ?: readJsonInput();
$action = $input["action"] ?? "";
$id = (int)($input["id"] ?? 0);

if ($action === "delete") {
    $row = dbOne($conn, "SELECT * FROM surat_masuk WHERE id = ?", "i", [$id]);

    if (!$row) {
        jsonResponse(404, ["message" => "Surat masuk tidak ditemukan"]);
    }

    dbRun($conn, "DELETE FROM surat_masuk WHERE id = ?", "i", [$id]);
    deleteStoredFile($row["file_ref"]);
    jsonResponse(200, ["message" => "Surat masuk {$row["kode_agenda"]} dihapus"]);
}

if ($action !== "save") {
    jsonResponse(400, ["message" => "Aksi tidak valid"]);
}

$nomorSuratAsal = trim($input["nomor_surat_asal"] ?? "");
$asalSurat = trim($input["asal_surat"] ?? "");
$perihal = trim($input["perihal"] ?? "");
$tanggalSurat = $input["tanggal_surat"] ?? "";
$tanggalTerima = $input["tanggal_terima"] ?? "";
$keterangan = trim($input["keterangan"] ?? "");
$keteranganDb = $keterangan === "" ? null : $keterangan;

if ($nomorSuratAsal === "" || $asalSurat === "" || $perihal === "" || !isValidDate($tanggalSurat)) {
    jsonResponse(400, ["message" => "Nomor surat, asal surat, perihal, dan tanggal surat wajib diisi"]);
}

if (mb_strlen($nomorSuratAsal) > 100 || mb_strlen($asalSurat) > 150 || mb_strlen($perihal) > 255) {
    jsonResponse(400, ["message" => "Isian terlalu panjang"]);
}

if ($id > 0) {
    $row = dbOne($conn, "SELECT * FROM surat_masuk WHERE id = ?", "i", [$id]);

    if (!$row) {
        jsonResponse(404, ["message" => "Surat masuk tidak ditemukan"]);
    }

    $file = validateUpload("file", false);
    $stored = null;

    if ($file) {
        list($stored, $error) = storeFile($file, "Surat Masuk " . $row["kode_agenda"]);
        if ($error !== null) {
            jsonResponse(400, ["message" => $error]);
        }
    }

    // Tanggal terima tidak diubah karena menentukan nomor agenda
    dbRun(
        $conn,
        "UPDATE surat_masuk
         SET nomor_surat_asal = ?, asal_surat = ?, perihal = ?, tanggal_surat = ?, keterangan = ?, file_url = ?, file_name = ?, file_ref = ?
         WHERE id = ?",
        "ssssssssi",
        [
            $nomorSuratAsal,
            $asalSurat,
            $perihal,
            $tanggalSurat,
            $keteranganDb,
            $stored["url"] ?? $row["file_url"],
            $stored["name"] ?? $row["file_name"],
            $stored["ref"] ?? $row["file_ref"],
            $id,
        ]
    );

    if ($stored) {
        deleteStoredFile($row["file_ref"]);
    }

    jsonResponse(200, ["message" => "Surat masuk diperbarui"]);
}

if (!isValidDate($tanggalTerima)) {
    jsonResponse(400, ["message" => "Tanggal terima wajib diisi"]);
}

$file = validateUpload("file", true);
$tahun = (int)substr($tanggalTerima, 0, 4);

list($newId, $kodeAgenda) = withLock($conn, "sicaf_agenda_surat_masuk", function () use ($conn, $user, $tahun, $nomorSuratAsal, $asalSurat, $perihal, $tanggalSurat, $tanggalTerima, $keteranganDb) {
    $nomorAgenda = nextNomorUrut($conn, "surat_masuk", "nomor_agenda", $tahun);
    $kodeAgenda = sprintf("%03d/SM/%d", $nomorAgenda, $tahun);

    dbRun(
        $conn,
        "INSERT INTO surat_masuk (tahun, nomor_agenda, kode_agenda, nomor_surat_asal, asal_surat, perihal, tanggal_surat, tanggal_terima, keterangan, file_url, dicatat_oleh)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)",
        "iisssssssi",
        [$tahun, $nomorAgenda, $kodeAgenda, $nomorSuratAsal, $asalSurat, $perihal, $tanggalSurat, $tanggalTerima, $keteranganDb, $user["id"]]
    );

    return [mysqli_insert_id($conn), $kodeAgenda];
});

list($stored, $error) = storeFile($file, "Surat Masuk " . $kodeAgenda);

if ($error !== null) {
    dbRun($conn, "DELETE FROM surat_masuk WHERE id = ?", "i", [$newId]);
    jsonResponse(400, ["message" => $error]);
}

dbRun(
    $conn,
    "UPDATE surat_masuk SET file_url = ?, file_name = ?, file_ref = ? WHERE id = ?",
    "sssi",
    [$stored["url"], $stored["name"], $stored["ref"], $newId]
);

jsonResponse(201, [
    "message" => "Surat masuk dicatat dengan nomor agenda $kodeAgenda",
    "data" => ["id" => $newId, "kode_agenda" => $kodeAgenda],
]);
