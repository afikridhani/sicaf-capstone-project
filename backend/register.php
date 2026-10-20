<?php

require_once __DIR__ . "/db.php";

$input = readJsonInput();

$email = trim($input["email"] ?? "");
$password = (string)($input["password"] ?? "");
$namaLengkap = trim($input["nama_lengkap"] ?? "");
$nip = trim($input["nip"] ?? "");
$jabatan = trim($input["jabatan"] ?? "");
$jenisKelamin = $input["jenis_kelamin"] ?? "";

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(400, ["message" => "Format email tidak valid"]);
}

if (strlen($password) < 8) {
    jsonResponse(400, ["message" => "Password minimal 8 karakter"]);
}

if ($namaLengkap === "" || $jabatan === "" || !in_array($jenisKelamin, ["male", "female"], true)) {
    jsonResponse(400, ["message" => "Nama, jabatan, dan jenis kelamin wajib diisi"]);
}

if (dbOne($conn, "SELECT id FROM users WHERE email = ?", "s", [$email])) {
    jsonResponse(409, ["message" => "Email sudah terdaftar"]);
}

// Pendaftaran mandiri selalu sebagai Guru/Staf; peran Admin dan Kepala Sekolah diatur oleh Admin
dbRun(
    $conn,
    "INSERT INTO users (email, password, nama_lengkap, nip, jabatan, jenis_kelamin, role) VALUES (?, ?, ?, ?, ?, ?, 'user')",
    "ssssss",
    [$email, password_hash($password, PASSWORD_DEFAULT), $namaLengkap, $nip === "" ? null : $nip, $jabatan, $jenisKelamin]
);

jsonResponse(201, ["message" => "Registrasi berhasil, silakan login"]);
