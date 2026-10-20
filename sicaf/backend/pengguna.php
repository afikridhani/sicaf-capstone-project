<?php

require_once __DIR__ . "/db.php";

$admin = requireUser(["admin"]);

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $rows = dbAll(
        $conn,
        "SELECT users.id, users.email, users.nama_lengkap, users.nip, users.jabatan, users.jenis_kelamin, users.role, users.created_at,
                (SELECT COUNT(*) FROM surat WHERE surat.user_id = users.id) AS jumlah_surat
         FROM users
         ORDER BY FIELD(users.role, 'kepsek', 'admin', 'user'), users.nama_lengkap"
    );

    jsonResponse(200, ["data" => $rows]);
}

$input = readJsonInput();
$action = $input["action"] ?? "";
$id = (int)($input["id"] ?? 0);

if ($id === $admin["id"]) {
    jsonResponse(400, ["message" => "Anda tidak dapat mengubah peran atau menghapus akun sendiri"]);
}

if (!dbOne($conn, "SELECT id FROM users WHERE id = ?", "i", [$id])) {
    jsonResponse(404, ["message" => "Pengguna tidak ditemukan"]);
}

if ($action === "role") {
    $role = $input["role"] ?? "";

    if (!in_array($role, ROLES, true)) {
        jsonResponse(400, ["message" => "Peran tidak valid"]);
    }

    dbRun($conn, "UPDATE users SET role = ? WHERE id = ?", "si", [$role, $id]);
    jsonResponse(200, ["message" => "Peran pengguna diperbarui"]);
}

if ($action === "delete") {
    // Ditolak oleh foreign key bila pengguna masih memiliki surat atau riwayat
    dbRun($conn, "DELETE FROM users WHERE id = ?", "i", [$id]);
    jsonResponse(200, ["message" => "Pengguna dihapus"]);
}

jsonResponse(400, ["message" => "Aksi tidak valid"]);
