<?php

require_once __DIR__ . "/db.php";

requireUser(["user", "admin"]);

$input = readJsonInput();
$jenisSuratId = (int)($input["jenis_surat_id"] ?? 0);
$tanggalSurat = $input["tanggal_surat"] ?? "";

if (!isValidDate($tanggalSurat)) {
    jsonResponse(400, ["message" => "Tanggal surat tidak valid"]);
}

$jenis = dbOne($conn, "SELECT kode FROM jenis_surat WHERE id = ?", "i", [$jenisSuratId]);

if (!$jenis) {
    jsonResponse(404, ["message" => "Jenis surat tidak ditemukan"]);
}

$nomor = nextNomorUrut($conn, "surat", "nomor_urut", (int)substr($tanggalSurat, 0, 4));

jsonResponse(200, ["data" => buildNomorSurat($jenis["kode"], $nomor, $tanggalSurat)]);
