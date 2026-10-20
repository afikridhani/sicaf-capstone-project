<?php

require_once __DIR__ . "/helpers.php";

$host = "localhost";
$user = "root";
$password = "";
$database = "sicaf";
$port = 3306;

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = mysqli_connect($host, $user, $password, $database, $port);
} catch (mysqli_sql_exception $e) {
    jsonResponse(500, ["message" => "Koneksi database gagal. Pastikan MySQL berjalan dan file db.sql sudah diimpor."]);
}

mysqli_set_charset($conn, "utf8mb4");
