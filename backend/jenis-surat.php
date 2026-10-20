<?php

require_once __DIR__ . "/db.php";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    requireUser();

    $rows = dbAll(
        $conn,
        "SELECT jenis_surat.id, jenis_surat.kode, jenis_surat.nama_jenis, COUNT(surat.id) AS dipakai
         FROM jenis_surat LEFT JOIN surat ON surat.jenis_surat_id = jenis_surat.id
         GROUP BY jenis_surat.id
         ORDER BY jenis_surat.kode"
    );

    jsonResponse(200, ["data" => $rows]);
}

requireUser(["admin"]);
$input = readJsonInput();
$action = $input["action"] ?? "";
$id = (int)($input["id"] ?? 0);

if ($action === "save") {
    $kode = trim($input["kode"] ?? "");
    $namaJenis = trim($input["nama_jenis"] ?? "");

    // Tanda "/" dilarang karena dipakai sebagai pemisah pada nomor surat
    if (!preg_match('/^[0-9A-Za-z.\-]{1,20}$/', $kode)) {
        jsonResponse(400, ["message" => "Kode hanya boleh berisi huruf, angka, titik, atau strip (maks. 20 karakter)"]);
    }

    if ($namaJenis === "" || mb_strlen($namaJenis) > 150) {
        jsonResponse(400, ["message" => "Nama jenis surat wajib diisi (maks. 150 karakter)"]);
    }

    if ($id > 0) {
        dbRun($conn, "UPDATE jenis_surat SET kode = ?, nama_jenis = ? WHERE id = ?", "ssi", [$kode, $namaJenis, $id]);
        jsonResponse(200, ["message" => "Jenis surat diperbarui"]);
    }

    dbRun($conn, "INSERT INTO jenis_surat (kode, nama_jenis) VALUES (?, ?)", "ss", [$kode, $namaJenis]);
    jsonResponse(201, ["message" => "Jenis surat ditambahkan"]);
}

if ($action === "delete") {
    $dipakai = (int)dbOne($conn, "SELECT COUNT(*) AS jumlah FROM surat WHERE jenis_surat_id = ?", "i", [$id])["jumlah"];

    if ($dipakai > 0) {
        jsonResponse(409, ["message" => "Jenis surat sudah dipakai oleh $dipakai surat sehingga tidak dapat dihapus"]);
    }

    dbRun($conn, "DELETE FROM jenis_surat WHERE id = ?", "i", [$id]);
    jsonResponse(200, ["message" => "Jenis surat dihapus"]);
}

jsonResponse(400, ["message" => "Aksi tidak valid"]);
