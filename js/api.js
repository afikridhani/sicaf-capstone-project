// Utilitas bersama: pemanggilan API, label status, dan format tampilan

const API_BASE_URL = "backend";

async function apiRequest(path, options = {}) {
  const { body, ...rest } = options;
  const request = { credentials: "same-origin", ...rest, headers: {} };

  if (body instanceof FormData) {
    request.body = body;
  } else if (body !== undefined) {
    request.headers["Content-Type"] = "application/json";
    request.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}/${path}`, request);
  const text = await response.text();
  let result;

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: "Respons server tidak valid. Pastikan aplikasi dijalankan melalui server PHP." };
  }

  if (!response.ok) {
    const error = new Error(result.message || "Permintaan gagal");
    error.status = response.status;
    throw error;
  }

  return result;
}

async function performLogout() {
  try {
    await apiRequest("logout.php");
  } finally {
    window.location.href = "login.html";
  }
}

const ROLE_LABELS = {
  user: "Guru / Staf",
  admin: "Admin Tata Usaha",
  kepsek: "Kepala Sekolah",
};

const STATUS = {
  dikirim_admin: { label: "Menunggu Verifikasi TU", tone: "pending" },
  revisi_admin: { label: "Perlu Revisi (TU)", tone: "revisi" },
  diteruskan_kepsek: { label: "Menunggu Persetujuan Kepsek", tone: "process" },
  revisi_kepsek: { label: "Perlu Revisi (Kepsek)", tone: "revisi" },
  ditolak_kepsek: { label: "Ditolak", tone: "ditolak" },
  disetujui: { label: "Disetujui", tone: "disetujui" },
};

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusBadge(status) {
  const info = STATUS[status] || { label: status, tone: "pending" };
  return `<span class="badge ${info.tone}">${escapeHtml(info.label)}</span>`;
}

function parseDate(value) {
  if (!value) return null;
  const [datePart, timePart = "00:00:00"] = String(value).split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

function formatTanggal(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
}

function formatWaktu(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Dialog modal berada di "top layer", jadi SweetAlert ditempel ke dialog yang sedang terbuka agar tidak tertutup
const swal = (options) => Swal.fire({ target: document.querySelector("dialog[open]") || document.body, ...options });

const toast = (icon, title) =>
  swal({ toast: true, position: "top-end", icon, title, timer: 2600, showConfirmButton: false, timerProgressBar: true });

function showError(error, title = "Terjadi Kesalahan") {
  if (error.status === 401) {
    window.location.href = "login.html";
    return;
  }
  swal({ icon: "error", title, text: error.message || "Silakan coba lagi." });
}
