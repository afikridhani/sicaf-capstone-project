<?php

require_once __DIR__ . "/db.php";

$input = readJsonInput();
$email = trim($input["email"] ?? "");
$password = (string)($input["password"] ?? "");

if ($email === "" || $password === "") {
    jsonResponse(400, ["message" => "Email dan password wajib diisi"]);
}

$user = dbOne($conn, "SELECT * FROM users WHERE email = ?", "s", [$email]);

if (!$user || !password_verify($password, $user["password"])) {
    jsonResponse(401, ["message" => "Email atau password salah"]);
}

startSession();
session_regenerate_id(true);
$_SESSION["user"] = normalizeUserRow($user);

jsonResponse(200, ["message" => "Login berhasil", "user" => $_SESSION["user"]]);
