<?php

// Identitas sekolah yang dipakai pada format nomor surat
const NAMA_SEKOLAH = "SMK Negeri 1 Sedayu";
const KODE_SEKOLAH = "SMKN1SDY";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
    "pdf" => "application/pdf",
    "doc" => "application/msword",
    "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ROLES = ["user", "admin", "kepsek"];

header("Content-Type: application/json; charset=utf-8");

set_exception_handler(function ($e) {
    error_log((string)$e);

    if ($e instanceof mysqli_sql_exception && $e->getCode() === 1062) {
        jsonResponse(409, ["message" => "Data yang sama sudah ada"]);
    }

    if ($e instanceof mysqli_sql_exception && $e->getCode() === 1451) {
        jsonResponse(409, ["message" => "Data tidak dapat dihapus karena masih dipakai oleh data lain"]);
    }

    jsonResponse(500, ["message" => "Terjadi kesalahan pada server"]);
});

function jsonResponse($statusCode, array $payload)
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function readJsonInput()
{
    $data = json_decode(file_get_contents("php://input"), true);
    return is_array($data) ? $data : [];
}

function isValidDate($value)
{
    $date = DateTime::createFromFormat("Y-m-d", (string)$value);
    return $date && $date->format("Y-m-d") === $value;
}

/* ---------- Database ---------- */

function dbRun($conn, $sql, $types = "", array $params = [])
{
    $stmt = mysqli_prepare($conn, $sql);

    if ($types !== "") {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }

    mysqli_stmt_execute($stmt);
    $affected = mysqli_stmt_affected_rows($stmt);
    mysqli_stmt_close($stmt);

    return $affected;
}

function dbAll($conn, $sql, $types = "", array $params = [])
{
    $stmt = mysqli_prepare($conn, $sql);

    if ($types !== "") {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }

    mysqli_stmt_execute($stmt);
    $rows = mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);

    return $rows;
}

function dbOne($conn, $sql, $types = "", array $params = [])
{
    return dbAll($conn, $sql, $types, $params)[0] ?? null;
}

// Kunci bernama di MySQL agar dua pengajuan bersamaan tidak mendapat nomor yang sama
function withLock($conn, $name, callable $callback)
{
    $lock = dbOne($conn, "SELECT GET_LOCK(?, 10) AS ok", "s", [$name]);

    if ((int)($lock["ok"] ?? 0) !== 1) {
        jsonResponse(503, ["message" => "Sistem sedang sibuk, silakan coba lagi"]);
    }

    try {
        return $callback();
    } finally {
        dbOne($conn, "SELECT RELEASE_LOCK(?) AS ok", "s", [$name]);
    }
}

/* ---------- Sesi & hak akses (RBAC) ---------- */

function startSession()
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(["httponly" => true, "samesite" => "Lax"]);
        session_start();
    }
}

function normalizeUserRow(array $user)
{
    return [
        "id" => (int)$user["id"],
        "email" => $user["email"],
        "nama_lengkap" => $user["nama_lengkap"],
        "nip" => $user["nip"],
        "jabatan" => $user["jabatan"],
        "jenis_kelamin" => $user["jenis_kelamin"],
        "role" => $user["role"],
    ];
}

// Data pengguna dibaca ulang dari database agar perubahan peran langsung berlaku
function requireUser(array $roles = [])
{
    global $conn;
    startSession();

    $sessionUser = $_SESSION["user"] ?? null;
    $row = $sessionUser ? dbOne($conn, "SELECT * FROM users WHERE id = ?", "i", [$sessionUser["id"]]) : null;

    if (!$row) {
        $_SESSION = [];
        jsonResponse(401, ["message" => "Sesi berakhir, silakan login kembali"]);
    }

    $user = normalizeUserRow($row);
    $_SESSION["user"] = $user;

    if ($roles && !in_array($user["role"], $roles, true)) {
        jsonResponse(403, ["message" => "Anda tidak memiliki akses ke fitur ini"]);
    }

    return $user;
}

/* ---------- Penomoran ---------- */

function bulanRomawi($bulan)
{
    return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][(int)$bulan - 1];
}

// Nomor urut berlanjut sepanjang tahun dan kembali ke 1 setiap tahun baru
function nextNomorUrut($conn, $table, $column, $tahun)
{
    $row = dbOne($conn, "SELECT COALESCE(MAX($column), 0) + 1 AS nomor FROM $table WHERE tahun = ?", "i", [$tahun]);
    return (int)$row["nomor"];
}

// Format: kode klasifikasi / nomor urut / kode sekolah / bulan romawi / tahun
function buildNomorSurat($kodeKlasifikasi, $nomorUrut, $tanggalSurat)
{
    $time = strtotime($tanggalSurat);

    return [
        "kode_surat" => sprintf(
            "%s/%03d/%s/%s/%s",
            $kodeKlasifikasi,
            $nomorUrut,
            KODE_SEKOLAH,
            bulanRomawi(date("n", $time)),
            date("Y", $time)
        ),
        "bagian" => [
            "kode_klasifikasi" => $kodeKlasifikasi,
            "nomor_urut" => sprintf("%03d", $nomorUrut),
            "kode_sekolah" => KODE_SEKOLAH,
            "bulan" => bulanRomawi(date("n", $time)),
            "tahun" => date("Y", $time),
        ],
    ];
}

function logSurat($conn, $suratId, $userId, $aksi, $statusSebelum, $statusSesudah, $catatan = null)
{
    dbRun(
        $conn,
        "INSERT INTO surat_logs (surat_id, user_id, aksi, status_sebelum, status_sesudah, catatan) VALUES (?, ?, ?, ?, ?, ?)",
        "iissss",
        [$suratId, $userId, $aksi, $statusSebelum, $statusSesudah, $catatan]
    );
}

/* ---------- Penyimpanan dokumen ---------- */

function validateUpload($field, $required)
{
    $file = $_FILES[$field] ?? null;

    if (!$file || $file["error"] === UPLOAD_ERR_NO_FILE) {
        if ($required) {
            jsonResponse(400, ["message" => "Dokumen surat wajib diunggah"]);
        }
        return null;
    }

    if ($file["error"] === UPLOAD_ERR_INI_SIZE || $file["error"] === UPLOAD_ERR_FORM_SIZE || $file["size"] > MAX_UPLOAD_BYTES) {
        jsonResponse(400, ["message" => "Ukuran dokumen maksimal 10 MB"]);
    }

    if ($file["error"] !== UPLOAD_ERR_OK) {
        jsonResponse(400, ["message" => "Dokumen gagal diunggah"]);
    }

    $file["ext"] = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));

    if (!isset(ALLOWED_FILE_TYPES[$file["ext"]])) {
        jsonResponse(400, ["message" => "Format dokumen harus PDF, DOC, atau DOCX"]);
    }

    return $file;
}

function sanitizeFileName($baseName)
{
    $name = preg_replace('/[\\\\\/:*?"<>|]+/', '-', trim((string)$baseName));
    $name = trim(preg_replace('/\s+/', ' ', $name), " .-_");
    return $name === "" ? "dokumen" : $name;
}

function uploadsDir()
{
    return dirname(__DIR__) . DIRECTORY_SEPARATOR . "uploads";
}

// Simpan ke Google Drive bila dikonfigurasi, selain itu ke folder uploads/ di server
function storeFile(array $file, $baseName)
{
    $finalName = sanitizeFileName($baseName) . "." . $file["ext"];
    $driveConfig = getGoogleAppsScriptConfig();

    if ($driveConfig !== null) {
        $bytes = file_get_contents($file["tmp_name"]);

        list($uploaded, $error) = callGoogleAppsScript($driveConfig, [
            "action" => "upload",
            "file_name" => $finalName,
            "mime_type" => ALLOWED_FILE_TYPES[$file["ext"]],
            "content_base64" => base64_encode($bytes),
        ]);

        if ($error !== null) {
            return [null, $error];
        }

        return [[
            "url" => $uploaded["file_url"] ?? ("https://drive.google.com/file/d/" . $uploaded["file_id"] . "/view"),
            "name" => $uploaded["file_name"] ?? $finalName,
            "ref" => "drive:" . $uploaded["file_id"],
        ], null];
    }

    if (!is_dir(uploadsDir())) {
        mkdir(uploadsDir(), 0775, true);
    }

    // Awalan acak agar nama file di server tidak bisa ditebak
    $storedName = bin2hex(random_bytes(8)) . "_" . $finalName;

    if (!move_uploaded_file($file["tmp_name"], uploadsDir() . DIRECTORY_SEPARATOR . $storedName)) {
        return [null, "Dokumen gagal disimpan di server"];
    }

    return [[
        "url" => "backend/file.php?f=" . rawurlencode($storedName),
        "name" => $finalName,
        "ref" => "local:" . $storedName,
    ], null];
}

function deleteStoredFile($ref)
{
    $ref = (string)$ref;

    if (str_starts_with($ref, "drive:")) {
        $driveConfig = getGoogleAppsScriptConfig();
        if ($driveConfig !== null) {
            callGoogleAppsScript($driveConfig, ["action" => "delete", "file_id" => substr($ref, 6)]);
        }
        return;
    }

    if (str_starts_with($ref, "local:")) {
        $path = uploadsDir() . DIRECTORY_SEPARATOR . basename(substr($ref, 6));
        if (is_file($path)) {
            unlink($path);
        }
    }
}

/* ---------- Google Drive (opsional, via Google Apps Script) ---------- */

function getGoogleAppsScriptConfig()
{
    $configFile = __DIR__ . DIRECTORY_SEPARATOR . "google-drive-config.php";
    $config = file_exists($configFile) ? require $configFile : [];

    $url = $config["web_app_url"] ?? getenv("GOOGLE_APPS_SCRIPT_WEB_APP_URL") ?: "";

    if ($url === "" || str_contains($url, "YOUR_DEPLOYMENT_ID")) {
        return null;
    }

    return [
        "web_app_url" => $url,
        "shared_secret" => $config["shared_secret"] ?? getenv("GOOGLE_APPS_SCRIPT_SHARED_SECRET") ?: "",
        "timeout_seconds" => (int)($config["timeout_seconds"] ?? 30),
    ];
}

function callGoogleAppsScript(array $config, array $payload)
{
    if ($config["shared_secret"] !== "") {
        $payload["shared_secret"] = $config["shared_secret"];
    }

    $curl = curl_init($config["web_app_url"]);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => $config["timeout_seconds"],
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
    ]);

    $body = curl_exec($curl);
    $error = curl_error($curl);
    curl_close($curl);

    if ($body === false) {
        return [null, "Gagal terhubung ke Google Drive: " . $error];
    }

    $decoded = json_decode($body, true);

    if (!is_array($decoded)) {
        return [null, "Respons Google Apps Script tidak valid. Pastikan Web App sudah di-deploy ulang dengan kode terbaru."];
    }

    if (($decoded["ok"] ?? false) !== true) {
        return [null, $decoded["message"] ?? "Google Drive menolak permintaan"];
    }

    return [$decoded, null];
}
