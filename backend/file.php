<?php

require_once __DIR__ . "/db.php";

$user = requireUser();
$fileName = basename((string)($_GET["f"] ?? ""));
$ref = "local:" . $fileName;

// Pengaju hanya boleh membuka dokumen suratnya sendiri; surat masuk hanya untuk Admin dan Kepala Sekolah
$surat = dbOne($conn, "SELECT user_id FROM surat WHERE file_ref = ?", "s", [$ref]);

if ($surat) {
    $allowed = $user["role"] !== "user" || (int)$surat["user_id"] === $user["id"];
} else {
    $allowed = $user["role"] !== "user" && dbOne($conn, "SELECT id FROM surat_masuk WHERE file_ref = ?", "s", [$ref]) !== null;
}

$path = uploadsDir() . DIRECTORY_SEPARATOR . $fileName;

if (!$allowed || $fileName === "" || !is_file($path)) {
    jsonResponse(404, ["message" => "Dokumen tidak ditemukan"]);
}

$ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
$downloadName = substr($fileName, strpos($fileName, "_") + 1);

header("Content-Type: " . (ALLOWED_FILE_TYPES[$ext] ?? "application/octet-stream"));
header("X-Content-Type-Options: nosniff");
header("Content-Length: " . filesize($path));
header(sprintf('Content-Disposition: %s; filename="%s"', $ext === "pdf" ? "inline" : "attachment", $downloadName));
readfile($path);
