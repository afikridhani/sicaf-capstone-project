<?php

require_once __DIR__ . "/db.php";

$user = requireUser();

jsonResponse(200, ["user" => $user, "sekolah" => NAMA_SEKOLAH]);
