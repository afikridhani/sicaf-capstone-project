// SICAF - logika halaman aplikasi (satu halaman untuk semua peran)

const state = {
  user: null,
  dashboard: null,
  data: { mine: [], verifikasi: [], persetujuan: [], arsip: [], semua: [], suratMasuk: [], jenis: [], pengguna: [] },
  filters: {},
};

const ALL_ROLES = ["user", "admin", "kepsek"];

// Menu samping per peran (Role Based Access Control di sisi tampilan; backend tetap memeriksa ulang)
const MENU = [
  { group: "Utama", items: [{ id: "dashboard", label: "Dashboard", icon: "ri-dashboard-3-line", roles: ALL_ROLES }] },
  {
    group: "Persuratan",
    items: [
      { id: "ambil", label: "Ambil Nomor Surat", icon: "ri-file-add-line", roles: ["user", "admin"] },
      { id: "suratSaya", label: "Surat Saya", icon: "ri-mail-send-line", roles: ["user", "admin"], count: () => state.data.mine.filter((s) => s.status.startsWith("revisi_")).length },
      { id: "verifikasi", label: "Verifikasi Surat", icon: "ri-shield-check-line", roles: ["admin"], count: () => state.data.verifikasi.length },
      { id: "persetujuan", label: "Persetujuan Surat", icon: "ri-quill-pen-line", roles: ["kepsek"], count: () => state.data.persetujuan.length },
    ],
  },
  {
    group: "Arsip Digital",
    items: [
      { id: "arsip", label: "Arsip Surat Keluar", icon: "ri-archive-2-line", roles: ALL_ROLES },
      { id: "suratMasuk", label: "Arsip Surat Masuk", icon: "ri-inbox-archive-line", roles: ["admin", "kepsek"] },
    ],
  },
  { group: "Laporan", items: [{ id: "rekap", label: "Rekap Persuratan", icon: "ri-bar-chart-box-line", roles: ["admin", "kepsek"] }] },
  {
    group: "Pengaturan",
    items: [
      { id: "jenis", label: "Jenis & Kode Surat", icon: "ri-price-tag-3-line", roles: ["admin"] },
      { id: "pengguna", label: "Pengguna", icon: "ri-team-line", roles: ["admin"] },
    ],
  },
];

const DATASETS = {
  mine: { roles: ["user", "admin"], path: "surat-list.php?scope=mine" },
  verifikasi: { roles: ["admin"], path: "surat-list.php?scope=verifikasi" },
  persetujuan: { roles: ["kepsek"], path: "surat-list.php?scope=persetujuan" },
  arsip: { roles: ALL_ROLES, path: "surat-list.php?scope=arsip" },
  semua: { roles: ["admin", "kepsek"], path: "surat-list.php?scope=semua" },
  suratMasuk: { roles: ["admin", "kepsek"], path: "surat-masuk.php" },
  jenis: { roles: ALL_ROLES, path: "jenis-surat.php" },
  pengguna: { roles: ["admin"], path: "pengguna.php" },
};

const can = (roles) => roles.includes(state.user.role);
const isOwner = (s) => Number(s.user_id) === state.user.id;
const isEditable = (s) => isOwner(s) && ["dikirim_admin", "revisi_admin", "revisi_kepsek"].includes(s.status);
const isDeletable = (s) => state.user.role === "admin" || (isOwner(s) && !["diteruskan_kepsek", "disetujui"].includes(s.status));

function findSurat(id) {
  const { mine, verifikasi, persetujuan, arsip, semua } = state.data;
  return [...mine, ...verifikasi, ...persetujuan, ...arsip, ...semua].find((s) => Number(s.id) === Number(id));
}

/* ===================== Memuat data ===================== */

async function loadAll() {
  const entries = Object.entries(DATASETS).filter(([, dataset]) => can(dataset.roles));
  const [dashboard, ...results] = await Promise.all([
    apiRequest("dashboard.php"),
    ...entries.map(([, dataset]) => apiRequest(dataset.path)),
  ]);

  state.dashboard = dashboard;
  entries.forEach(([key], index) => (state.data[key] = results[index].data || []));
  renderAll();
}

async function refresh() {
  try {
    await loadAll();
  } catch (error) {
    showError(error, "Gagal memuat data");
  }
}

function renderAll() {
  renderNav();
  renderDashboard();
  renderOptions();
  Object.keys(TABLES).forEach(renderTable);
  renderRekap();
}

/* ===================== Navigasi ===================== */

const visibleMenu = () =>
  MENU.map((group) => ({ ...group, items: group.items.filter((item) => can(item.roles)) })).filter((group) => group.items.length);

function currentSectionId() {
  const ids = visibleMenu().flatMap((group) => group.items.map((item) => item.id));
  const id = location.hash.slice(1);
  return ids.includes(id) ? id : "dashboard";
}

function renderNav() {
  const active = currentSectionId();

  document.getElementById("nav").innerHTML = visibleMenu()
    .map(
      (group) => `
        <div class="nav-group">
          <p>${group.group}</p>
          ${group.items
            .map((item) => {
              const count = item.count ? item.count() : 0;
              return `<a href="#${item.id}" class="${item.id === active ? "active" : ""}">
                <i class="${item.icon}"></i> ${escapeHtml(item.label)}
                ${count ? `<span class="count">${count}</span>` : ""}
              </a>`;
            })
            .join("")}
        </div>`
    )
    .join("");
}

function navigate() {
  const id = currentSectionId();

  document.querySelectorAll(".section").forEach((section) => (section.hidden = section.id !== id));
  const section = document.getElementById(id);
  document.getElementById("pageTitle").textContent = section.dataset.title;
  document.getElementById("pageSub").textContent = section.dataset.sub;
  document.title = `${section.dataset.title} - SICAF`;

  renderNav();
  toggleSidebar(false);
  window.scrollTo(0, 0);
}

function toggleSidebar(force) {
  document.getElementById("sidebar").classList.toggle("open", force);
}

async function confirmLogout() {
  const result = await swal({
    icon: "question",
    title: "Keluar dari SICAF?",
    showCancelButton: true,
    confirmButtonText: "Keluar",
    cancelButtonText: "Batal",
  });
  if (result.isConfirmed) performLogout();
}

/* ===================== Dashboard ===================== */

function salam() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function statCard(value, label, icon, tone) {
  return `<div class="stat"><span class="stat-icon tone-${tone}"><i class="${icon}"></i></span><div><strong>${value ?? 0}</strong><span>${label}</span></div></div>`;
}

function renderDashboard() {
  const { status_counts: c, surat_masuk_tahun_ini: masuk, total_pengguna: pengguna, terbaru } = state.dashboard;
  const role = state.user.role;
  const sapaan = state.user.jenis_kelamin === "female" ? "Ibu" : "Bapak";

  document.getElementById("todayText").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  document.getElementById("greeting").textContent = `${salam()}, ${sapaan} ${state.user.nama_lengkap}`;

  const heroText = {
    user: "Ajukan surat untuk mendapatkan nomor surat secara otomatis, lalu pantau statusnya di menu Surat Saya.",
    admin: `Ada ${c.dikirim_admin} surat yang menunggu verifikasi Anda.`,
    kepsek: `Ada ${c.diteruskan_kepsek} surat yang menunggu persetujuan Anda.`,
  };
  document.getElementById("heroText").textContent = heroText[role];

  const actions = {
    user: [["#ambil", "ri-file-add-line", "Ambil Nomor Surat", "btn-accent"], ["#suratSaya", "ri-mail-send-line", "Surat Saya", "btn-ghost"]],
    admin: [["#verifikasi", "ri-shield-check-line", "Verifikasi Surat", "btn-accent"], ["#ambil", "ri-file-add-line", "Ambil Nomor", "btn-ghost"]],
    kepsek: [["#persetujuan", "ri-quill-pen-line", "Persetujuan Surat", "btn-accent"], ["#arsip", "ri-archive-2-line", "Arsip Surat", "btn-ghost"]],
  };
  document.getElementById("heroActions").innerHTML = actions[role]
    .map(([href, icon, label, cls]) => `<a class="btn ${cls}" href="${href}" style="text-decoration:none"><i class="${icon}"></i> ${label}</a>`)
    .join("");

  const total = Object.values(c).reduce((sum, n) => sum + n, 0);
  const cards = {
    user: [
      statCard(total, "Total surat diajukan", "ri-file-list-3-line", "primary"),
      statCard(c.dikirim_admin + c.diteruskan_kepsek, "Sedang diproses", "ri-time-line", "warning"),
      statCard(c.revisi_admin + c.revisi_kepsek, "Perlu revisi", "ri-edit-2-line", "accent"),
      statCard(c.disetujui, "Disetujui", "ri-checkbox-circle-line", "success"),
      statCard(c.ditolak_kepsek, "Ditolak", "ri-close-circle-line", "danger"),
    ],
    admin: [
      statCard(c.dikirim_admin, "Menunggu verifikasi", "ri-shield-check-line", "warning"),
      statCard(c.diteruskan_kepsek, "Menunggu Kepala Sekolah", "ri-quill-pen-line", "info"),
      statCard(c.disetujui, "Arsip surat keluar", "ri-archive-2-line", "success"),
      statCard(masuk, `Surat masuk ${new Date().getFullYear()}`, "ri-inbox-archive-line", "primary"),
      statCard(pengguna, "Pengguna terdaftar", "ri-team-line", "accent"),
    ],
    kepsek: [
      statCard(c.diteruskan_kepsek, "Menunggu persetujuan", "ri-quill-pen-line", "warning"),
      statCard(c.disetujui, "Surat disetujui", "ri-checkbox-circle-line", "success"),
      statCard(c.ditolak_kepsek, "Surat ditolak", "ri-close-circle-line", "danger"),
      statCard(masuk, `Surat masuk ${new Date().getFullYear()}`, "ri-inbox-archive-line", "primary"),
    ],
  };
  document.getElementById("statCards").innerHTML = cards[role].join("");

  document.getElementById("recentList").innerHTML = terbaru.length
    ? terbaru
        .map(
          (s) => `
          <a href="#" onclick="openDetail(${s.id}); return false;">
            <div class="meta">
              <strong>${escapeHtml(s.kode_surat)}</strong>
              <span>${escapeHtml(s.judul_surat)} &middot; ${escapeHtml(s.nama_pengaju)}</span>
            </div>
            ${statusBadge(s.status)}
          </a>`
        )
        .join("")
    : `<p class="empty"><i class="ri-inbox-line"></i>Belum ada aktivitas surat.</p>`;
}

/* ===================== Tabel & filter ===================== */

const suratText = (s) => [s.kode_surat, s.judul_surat, s.tujuan, s.nama_pengaju, s.nama_jenis];

function actionButton(label, icon, onclick, cls = "btn-ghost") {
  return `<button class="btn ${cls} btn-sm" onclick="${onclick}"><i class="${icon}"></i> ${label}</button>`;
}

function fileLink(url) {
  return url
    ? `<a class="file-link" href="${escapeHtml(url)}" target="_blank" rel="noopener"><i class="ri-file-text-line"></i> Lihat</a>`
    : "&mdash;";
}

const cellNomor = (s) => `<td><span class="mono">${escapeHtml(s.kode_surat)}</span><span class="sub">${escapeHtml(s.nama_jenis)}</span></td>`;
const cellPerihal = (s) => `<td class="wide">${escapeHtml(s.judul_surat)}<span class="sub">Kepada: ${escapeHtml(s.tujuan)}</span></td>`;
const cellPengaju = (s) => `<td>${escapeHtml(s.nama_pengaju)}<span class="sub">${escapeHtml(s.jabatan_pengaju)}</span></td>`;
const cellTanggal = (value) => `<td class="nowrap">${formatTanggal(value)}</td>`;

const TABLES = {
  suratSaya: {
    data: () => state.data.mine,
    cols: 5,
    empty: "Belum ada surat. Ajukan surat melalui menu Ambil Nomor Surat.",
    row: (s) => `<tr>
      ${cellNomor(s)}${cellPerihal(s)}${cellTanggal(s.tanggal_surat)}<td>${statusBadge(s.status)}</td>
      <td><div class="row-actions">
        ${actionButton("Detail", "ri-eye-line", `openDetail(${s.id})`)}
        ${isEditable(s) ? actionButton(s.status.startsWith("revisi_") ? "Perbaiki" : "Ubah", "ri-edit-2-line", `openEdit(${s.id})`, s.status.startsWith("revisi_") ? "btn-warning" : "btn-ghost") : ""}
        ${isDeletable(s) ? actionButton("Hapus", "ri-delete-bin-6-line", `deleteSurat(${s.id})`) : ""}
      </div></td>
    </tr>`,
  },
  verifikasi: {
    data: () => state.data.verifikasi,
    cols: 5,
    empty: "Tidak ada surat yang menunggu verifikasi.",
    row: (s) => `<tr>${cellNomor(s)}${cellPerihal(s)}${cellPengaju(s)}${cellTanggal(s.tanggal_surat)}
      <td><div class="row-actions">${actionButton("Periksa", "ri-search-eye-line", `openDetail(${s.id})`, "btn-primary")}</div></td></tr>`,
  },
  persetujuan: {
    data: () => state.data.persetujuan,
    cols: 5,
    empty: "Tidak ada surat yang menunggu persetujuan.",
    row: (s) => `<tr>${cellNomor(s)}${cellPerihal(s)}${cellPengaju(s)}${cellTanggal(s.tanggal_surat)}
      <td><div class="row-actions">${actionButton("Tinjau", "ri-search-eye-line", `openDetail(${s.id})`, "btn-primary")}</div></td></tr>`,
  },
  arsip: {
    data: () => state.data.arsip,
    cols: 6,
    empty: "Tidak ada arsip surat yang sesuai.",
    row: (s) => `<tr>
      <td><span class="mono">${escapeHtml(s.kode_surat)}</span><span class="sub">${escapeHtml(s.nama_pengaju)}</span></td>
      <td>${escapeHtml(s.kode_jenis)}<span class="sub">${escapeHtml(s.nama_jenis)}</span></td>
      ${cellPerihal(s)}${cellTanggal(s.tanggal_surat)}<td>${fileLink(s.file_url)}</td>
      <td><div class="row-actions">
        ${actionButton("Detail", "ri-eye-line", `openDetail(${s.id})`)}
        ${state.user.role === "admin" ? actionButton("Hapus", "ri-delete-bin-6-line", `deleteSurat(${s.id})`) : ""}
      </div></td>
    </tr>`,
  },
  suratMasuk: {
    data: () => state.data.suratMasuk,
    cols: 6,
    dateKey: "tanggal_terima",
    text: (m) => [m.kode_agenda, m.nomor_surat_asal, m.asal_surat, m.perihal, m.keterangan],
    empty: "Belum ada surat masuk yang sesuai.",
    row: (m) => `<tr>
      <td><span class="mono">${escapeHtml(m.kode_agenda)}</span><span class="sub">No. ${escapeHtml(m.nomor_surat_asal)}</span></td>
      <td class="nowrap">${formatTanggal(m.tanggal_terima)}<span class="sub">Surat: ${formatTanggal(m.tanggal_surat)}</span></td>
      <td>${escapeHtml(m.asal_surat)}</td>
      <td>${escapeHtml(m.perihal)}${m.keterangan ? `<span class="sub">${escapeHtml(m.keterangan)}</span>` : ""}</td>
      <td>${fileLink(m.file_url)}</td>
      <td><div class="row-actions">${
        state.user.role === "admin"
          ? actionButton("Ubah", "ri-edit-2-line", `openMasukForm(${m.id})`) + actionButton("Hapus", "ri-delete-bin-6-line", `deleteMasuk(${m.id})`)
          : `<span class="sub">${escapeHtml(m.nama_pencatat)}</span>`
      }</div></td>
    </tr>`,
  },
  jenis: {
    data: () => state.data.jenis,
    cols: 4,
    empty: "Belum ada jenis surat.",
    row: (j) => `<tr>
      <td><span class="mono">${escapeHtml(j.kode)}</span></td>
      <td>${escapeHtml(j.nama_jenis)}</td>
      <td>${j.dipakai} surat</td>
      <td><div class="row-actions">
        ${actionButton("Ubah", "ri-edit-2-line", `openJenisForm(${j.id})`)}
        ${Number(j.dipakai) === 0 ? actionButton("Hapus", "ri-delete-bin-6-line", `deleteJenis(${j.id})`) : ""}
      </div></td>
    </tr>`,
  },
  pengguna: {
    data: () => state.data.pengguna,
    cols: 6,
    text: (u) => [u.nama_lengkap, u.email, u.jabatan, u.nip],
    empty: "Tidak ada pengguna yang sesuai.",
    row: (u) => {
      const self = Number(u.id) === state.user.id;
      const options = ALL_ROLES.map((role) => `<option value="${role}" ${role === u.role ? "selected" : ""}>${ROLE_LABELS[role]}</option>`).join("");
      return `<tr>
        <td><strong>${escapeHtml(u.nama_lengkap)}</strong>${self ? ' <span class="badge role">Anda</span>' : ""}<span class="sub">${escapeHtml(u.email)}</span></td>
        <td>${escapeHtml(u.jabatan)}${u.nip ? `<span class="sub">NIP ${escapeHtml(u.nip)}</span>` : ""}</td>
        <td><select style="min-width:170px" data-current="${u.role}" onchange="changeRole(${u.id}, this)" ${self ? "disabled" : ""} aria-label="Peran">${options}</select></td>
        <td>${u.jumlah_surat}</td>
        ${cellTanggal(u.created_at)}
        <td><div class="row-actions">${self ? "" : actionButton("Hapus", "ri-delete-bin-6-line", `deleteUser(${u.id})`)}</div></td>
      </tr>`;
    },
  },
};

function applyFilter(table, list) {
  const spec = TABLES[table];
  const filter = state.filters[table] || {};
  const keyword = (filter.q || "").trim().toLowerCase();
  const dateKey = spec.dateKey || "tanggal_surat";
  const text = spec.text || suratText;

  return list.filter((item) => {
    if (keyword && !text(item).join(" ").toLowerCase().includes(keyword)) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (filter.jenis && String(item.jenis_surat_id) !== filter.jenis) return false;
    if (filter.dari && item[dateKey] < filter.dari) return false;
    if (filter.sampai && item[dateKey] > filter.sampai) return false;
    return true;
  });
}

function renderTable(table) {
  const spec = TABLES[table];
  const rows = applyFilter(table, spec.data());

  document.getElementById(`tbl-${table}`).innerHTML = rows.length
    ? rows.map(spec.row).join("")
    : `<tr><td colspan="${spec.cols}" class="empty"><i class="ri-inbox-line"></i>${spec.empty}</td></tr>`;
}

function renderOptions() {
  const jenisOptions = state.data.jenis.map((j) => `<option value="${j.id}">${escapeHtml(j.kode)} &mdash; ${escapeHtml(j.nama_jenis)}</option>`).join("");

  const ambil = document.getElementById("ambilJenis");
  const selected = ambil.value;
  ambil.innerHTML = jenisOptions;
  if (selected) ambil.value = selected;

  document.querySelectorAll("[data-options]").forEach((select) => {
    const value = select.value;
    select.innerHTML =
      select.dataset.options === "jenis"
        ? `<option value="">Semua jenis</option>${jenisOptions}`
        : `<option value="">Semua status</option>${Object.entries(STATUS).map(([key, info]) => `<option value="${key}">${info.label}</option>`).join("")}`;
    select.value = value;
  });

  if (can(["user", "admin"])) updatePreview();
}

function bindFilters() {
  document.querySelectorAll("[data-table]").forEach((input) => {
    input.addEventListener("input", () => {
      const table = input.dataset.table;
      state.filters[table] = { ...state.filters[table], [input.dataset.key]: input.value };
      renderTable(table);
    });
  });
}

/* ===================== Ambil nomor ===================== */

async function updatePreview() {
  const jenisId = document.getElementById("ambilJenis").value;
  const tanggal = document.getElementById("ambilTanggal").value;
  const preview = document.getElementById("nomorPreview");
  const parts = document.getElementById("nomorParts");

  if (!jenisId || !tanggal) {
    preview.textContent = "—";
    parts.innerHTML = "";
    return;
  }

  try {
    const { data } = await apiRequest("surat-preview.php", {
      method: "POST",
      body: { jenis_surat_id: Number(jenisId), tanggal_surat: tanggal },
    });
    const b = data.bagian;
    preview.textContent = data.kode_surat;
    parts.innerHTML = [
      ["Kode klasifikasi", b.kode_klasifikasi],
      ["Nomor urut", b.nomor_urut],
      ["Kode sekolah", b.kode_sekolah],
      ["Bulan (romawi)", b.bulan],
      ["Tahun", b.tahun],
    ]
      .map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`)
      .join("");
  } catch {
    preview.textContent = "—";
    parts.innerHTML = "";
  }
}

async function submitForm(form, task) {
  const button = form.querySelector("button[type=submit]");
  const label = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line"></i> Menyimpan...';

  try {
    await task();
  } catch (error) {
    showError(error, "Gagal Menyimpan");
  } finally {
    button.disabled = false;
    button.innerHTML = label;
  }
}

function resetFileLabels(form) {
  form.querySelectorAll("[data-file-label]").forEach((label) => (label.textContent = label.dataset.default));
}

function bindForms() {
  // Tampilkan nama file yang dipilih pada area unggah
  document.querySelectorAll(".dropzone").forEach((zone) => {
    const label = zone.querySelector("[data-file-label]");
    label.dataset.default = label.textContent;
    zone.querySelector("input[type=file]").addEventListener("change", (event) => {
      const file = event.target.files[0];
      label.textContent = file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : label.dataset.default;
    });
  });

  const formAmbil = document.getElementById("formAmbil");
  const tanggal = document.getElementById("ambilTanggal");
  tanggal.value = todayIso();
  document.getElementById("ambilJenis").addEventListener("change", updatePreview);
  tanggal.addEventListener("change", updatePreview);

  formAmbil.addEventListener("reset", () => {
    setTimeout(() => {
      tanggal.value = todayIso();
      resetFileLabels(formAmbil);
      updatePreview();
    });
  });

  formAmbil.addEventListener("submit", (event) => {
    event.preventDefault();
    submitForm(formAmbil, async () => {
      const result = await apiRequest("surat-create.php", { method: "POST", body: new FormData(formAmbil) });
      await swal({
        icon: "success",
        title: "Nomor Surat Diterbitkan",
        html: `<p>Surat berhasil diajukan ke Tata Usaha dengan nomor:</p><p class="number-preview" style="margin-top:12px">${escapeHtml(result.data.kode_surat)}</p>`,
        confirmButtonText: "Lihat Surat Saya",
      });
      formAmbil.reset();
      await refresh();
      location.hash = "#suratSaya";
    });
  });

  const formEdit = document.getElementById("formEdit");
  formEdit.addEventListener("submit", (event) => {
    event.preventDefault();
    submitForm(formEdit, async () => {
      const result = await apiRequest("surat-update.php", { method: "POST", body: new FormData(formEdit) });
      dlgEdit.close();
      toast("success", result.message);
      await refresh();
    });
  });

  const formMasuk = document.getElementById("formMasuk");
  formMasuk.addEventListener("submit", (event) => {
    event.preventDefault();
    submitForm(formMasuk, async () => {
      const body = new FormData(formMasuk);
      body.append("action", "save");
      const result = await apiRequest("surat-masuk.php", { method: "POST", body });
      dlgMasuk.close();
      toast("success", result.message);
      await refresh();
    });
  });

  const formJenis = document.getElementById("formJenis");
  formJenis.addEventListener("submit", (event) => {
    event.preventDefault();
    submitForm(formJenis, async () => {
      const result = await apiRequest("jenis-surat.php", {
        method: "POST",
        body: { action: "save", ...Object.fromEntries(new FormData(formJenis)) },
      });
      dlgJenis.close();
      toast("success", result.message);
      await refresh();
    });
  });

  document.getElementById("rekapTahun").addEventListener("change", renderRekap);
  document.getElementById("rekapBulan").addEventListener("change", renderRekap);
}

/* ===================== Detail & alur persetujuan ===================== */

function catatanCallout(s) {
  if (!s.catatan) return "";
  if (s.status.startsWith("revisi_")) return `<div class="callout warn"><i class="ri-error-warning-line"></i><div><strong>Catatan revisi</strong><br>${escapeHtml(s.catatan)}</div></div>`;
  if (s.status === "ditolak_kepsek") return `<div class="callout danger"><i class="ri-close-circle-line"></i><div><strong>Alasan penolakan</strong><br>${escapeHtml(s.catatan)}</div></div>`;
  return `<div class="callout info"><i class="ri-chat-quote-line"></i><div><strong>Catatan</strong><br>${escapeHtml(s.catatan)}</div></div>`;
}

async function openDetail(id) {
  let result;
  try {
    result = await apiRequest(`surat-detail.php?id=${id}`);
  } catch (error) {
    showError(error);
    return;
  }

  const s = result.data;
  const role = state.user.role;

  document.getElementById("detailNomor").textContent = s.kode_surat;
  document.getElementById("detailBody").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px">
      ${statusBadge(s.status)}
      ${s.file_url ? `<a class="btn btn-ghost btn-sm" href="${escapeHtml(s.file_url)}" target="_blank" rel="noopener" style="text-decoration:none"><i class="ri-file-text-line"></i> Buka Dokumen</a>` : ""}
    </div>
    <dl class="info-grid">
      <div><dt>Jenis Surat</dt><dd>${escapeHtml(s.kode_jenis)} &mdash; ${escapeHtml(s.nama_jenis)}</dd></div>
      <div><dt>Tanggal Surat</dt><dd>${formatTanggal(s.tanggal_surat)}</dd></div>
      <div class="span-2"><dt>Perihal</dt><dd>${escapeHtml(s.judul_surat)}</dd></div>
      <div><dt>Tujuan</dt><dd>${escapeHtml(s.tujuan)}</dd></div>
      <div><dt>Pengaju</dt><dd>${escapeHtml(s.nama_pengaju)}<span class="sub">${escapeHtml(s.jabatan_pengaju)}</span></dd></div>
      <div class="span-2"><dt>Ringkasan Isi</dt><dd style="white-space:pre-line">${escapeHtml(s.isi_ringkas)}</dd></div>
    </dl>
    ${catatanCallout(s)}
    <p class="section-label">Riwayat Surat</p>
    <ol class="timeline">
      ${result.riwayat
        .map(
          (log) => `<li>
            <strong>${escapeHtml(log.aksi)}</strong>
            <span>${escapeHtml(log.nama_lengkap)} &middot; ${ROLE_LABELS[log.role]} &middot; ${formatWaktu(log.created_at)}</span>
            ${log.catatan ? `<q>${escapeHtml(log.catatan)}</q>` : ""}
          </li>`
        )
        .join("")}
    </ol>`;

  const buttons = [];
  if (role === "admin" && s.status === "dikirim_admin") {
    buttons.push(actionButton("Kembalikan untuk Revisi", "ri-arrow-go-back-line", `doAction(${s.id}, 'revisi_admin')`, "btn-warning"));
    buttons.push(actionButton("Teruskan ke Kepala Sekolah", "ri-send-plane-2-line", `doAction(${s.id}, 'teruskan')`, "btn-primary"));
  }
  if (role === "kepsek" && s.status === "diteruskan_kepsek") {
    buttons.push(actionButton("Tolak", "ri-close-line", `doAction(${s.id}, 'tolak')`, "btn-danger"));
    buttons.push(actionButton("Minta Revisi", "ri-arrow-go-back-line", `doAction(${s.id}, 'revisi_kepsek')`, "btn-warning"));
    buttons.push(actionButton("Setujui", "ri-check-line", `doAction(${s.id}, 'setujui')`, "btn-success"));
  }
  if (isEditable(s)) {
    buttons.push(actionButton(s.status.startsWith("revisi_") ? "Perbaiki Surat" : "Ubah Data", "ri-edit-2-line", `openEdit(${s.id})`, "btn-primary"));
  }

  document.getElementById("detailFoot").innerHTML = `
    ${isDeletable(s) ? actionButton("Hapus", "ri-delete-bin-6-line", `deleteSurat(${s.id})`) : ""}
    <span class="spacer"></span>
    <button class="btn btn-ghost btn-sm" onclick="dlgDetail.close()">Tutup</button>
    ${buttons.join("")}`;

  if (!dlgDetail.open) dlgDetail.showModal();
}

const ACTIONS = {
  teruskan: { title: "Teruskan ke Kepala Sekolah?", text: "Surat dinyatakan lengkap dan diteruskan untuk persetujuan.", confirm: "Ya, teruskan", color: "#1f4e9c" },
  revisi_admin: { title: "Kembalikan untuk Revisi", note: "Tuliskan bagian yang perlu diperbaiki...", confirm: "Kembalikan", color: "#b45309" },
  setujui: { title: "Setujui surat ini?", text: "Surat akan disahkan dan masuk ke arsip digital.", confirm: "Ya, setujui", color: "#15803d" },
  revisi_kepsek: { title: "Minta Revisi", note: "Tuliskan bagian yang perlu diperbaiki...", confirm: "Kembalikan", color: "#b45309" },
  tolak: { title: "Tolak Surat", note: "Tuliskan alasan penolakan...", confirm: "Tolak surat", color: "#b91c1c" },
};

async function doAction(id, action) {
  const config = ACTIONS[action];
  const result = await swal({
    icon: config.note ? undefined : "question",
    title: config.title,
    text: config.text,
    input: config.note ? "textarea" : undefined,
    inputPlaceholder: config.note,
    inputValidator: (value) => (config.note && !value.trim() ? "Catatan wajib diisi" : undefined),
    showCancelButton: true,
    confirmButtonText: config.confirm,
    cancelButtonText: "Batal",
    confirmButtonColor: config.color,
  });

  if (!result.isConfirmed) return;

  try {
    await apiRequest("surat-action.php", {
      method: "POST",
      body: { surat_id: id, action, catatan: typeof result.value === "string" ? result.value : "" },
    });
    dlgDetail.close();
    toast("success", "Status surat diperbarui");
    await refresh();
  } catch (error) {
    showError(error, "Gagal Memproses");
  }
}

function openEdit(id) {
  const s = findSurat(id);
  if (!s) return;

  const form = document.getElementById("formEdit");
  const isRevisi = s.status.startsWith("revisi_");
  form.reset();
  resetFileLabels(form);
  form.surat_id.value = s.id;
  form.judul_surat.value = s.judul_surat;
  form.tujuan.value = s.tujuan;
  form.isi_ringkas.value = s.isi_ringkas;

  document.getElementById("editNomor").textContent = s.kode_surat;
  const catatan = document.getElementById("editCatatan");
  catatan.hidden = !(isRevisi && s.catatan);
  catatan.innerHTML = `<i class="ri-error-warning-line"></i><div><strong>Catatan revisi</strong><br>${escapeHtml(s.catatan)}</div>`;
  document.getElementById("editSubmit").innerHTML = isRevisi
    ? '<i class="ri-send-plane-2-line"></i> Kirim Perbaikan'
    : '<i class="ri-save-line"></i> Simpan Perubahan';

  dlgDetail.close();
  dlgEdit.showModal();
}

async function deleteSurat(id) {
  const s = findSurat(id);
  const result = await swal({
    icon: "warning",
    title: "Hapus surat?",
    html: `Surat <b>${escapeHtml(s?.kode_surat || "")}</b> beserta dokumennya akan dihapus permanen.`,
    showCancelButton: true,
    confirmButtonText: "Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#b91c1c",
  });

  if (!result.isConfirmed) return;

  try {
    const response = await apiRequest("surat-delete.php", { method: "POST", body: { surat_id: id } });
    dlgDetail.close();
    toast("success", response.message);
    await refresh();
  } catch (error) {
    showError(error, "Gagal Menghapus");
  }
}

/* ===================== Surat masuk ===================== */

function openMasukForm(id) {
  const form = document.getElementById("formMasuk");
  const item = state.data.suratMasuk.find((m) => Number(m.id) === Number(id));
  form.reset();
  resetFileLabels(form);

  form.id.value = item?.id || "";
  form.nomor_surat_asal.value = item?.nomor_surat_asal || "";
  form.asal_surat.value = item?.asal_surat || "";
  form.perihal.value = item?.perihal || "";
  form.tanggal_surat.value = item?.tanggal_surat || "";
  form.tanggal_terima.value = item?.tanggal_terima || todayIso();
  form.keterangan.value = item?.keterangan || "";
  form.tanggal_terima.disabled = Boolean(item);
  form.file.required = !item;

  document.getElementById("masukTitle").textContent = item ? "Ubah Surat Masuk" : "Catat Surat Masuk";
  document.getElementById("masukSub").textContent = item ? `Nomor agenda ${item.kode_agenda}` : "Nomor agenda diberikan otomatis";
  dlgMasuk.showModal();
}

async function deleteMasuk(id) {
  const item = state.data.suratMasuk.find((m) => Number(m.id) === Number(id));
  const result = await swal({
    icon: "warning",
    title: "Hapus surat masuk?",
    html: `Arsip <b>${escapeHtml(item.kode_agenda)}</b> dari ${escapeHtml(item.asal_surat)} akan dihapus permanen.`,
    showCancelButton: true,
    confirmButtonText: "Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#b91c1c",
  });

  if (!result.isConfirmed) return;

  try {
    const response = await apiRequest("surat-masuk.php", { method: "POST", body: { action: "delete", id } });
    toast("success", response.message);
    await refresh();
  } catch (error) {
    showError(error, "Gagal Menghapus");
  }
}

/* ===================== Jenis surat ===================== */

function openJenisForm(id) {
  const form = document.getElementById("formJenis");
  const item = state.data.jenis.find((j) => Number(j.id) === Number(id));
  form.reset();
  form.id.value = item?.id || "";
  form.kode.value = item?.kode || "";
  form.nama_jenis.value = item?.nama_jenis || "";
  document.getElementById("jenisTitle").textContent = item ? "Ubah Jenis Surat" : "Tambah Jenis Surat";
  dlgJenis.showModal();
}

async function deleteJenis(id) {
  const item = state.data.jenis.find((j) => Number(j.id) === Number(id));
  const result = await swal({
    icon: "warning",
    title: "Hapus jenis surat?",
    text: `${item.kode} - ${item.nama_jenis}`,
    showCancelButton: true,
    confirmButtonText: "Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#b91c1c",
  });

  if (!result.isConfirmed) return;

  try {
    const response = await apiRequest("jenis-surat.php", { method: "POST", body: { action: "delete", id } });
    toast("success", response.message);
    await refresh();
  } catch (error) {
    showError(error, "Gagal Menghapus");
  }
}

/* ===================== Pengguna ===================== */

async function changeRole(id, select) {
  const user = state.data.pengguna.find((u) => Number(u.id) === Number(id));
  const result = await swal({
    icon: "question",
    title: "Ubah peran pengguna?",
    html: `<b>${escapeHtml(user.nama_lengkap)}</b> akan menjadi <b>${ROLE_LABELS[select.value]}</b>.`,
    showCancelButton: true,
    confirmButtonText: "Ubah",
    cancelButtonText: "Batal",
  });

  if (!result.isConfirmed) {
    select.value = select.dataset.current;
    return;
  }

  try {
    const response = await apiRequest("pengguna.php", { method: "POST", body: { action: "role", id, role: select.value } });
    toast("success", response.message);
    await refresh();
  } catch (error) {
    select.value = select.dataset.current;
    showError(error, "Gagal Mengubah Peran");
  }
}

async function deleteUser(id) {
  const user = state.data.pengguna.find((u) => Number(u.id) === Number(id));
  const result = await swal({
    icon: "warning",
    title: "Hapus pengguna?",
    html: `Akun <b>${escapeHtml(user.nama_lengkap)}</b> akan dihapus. Pengguna yang sudah memiliki surat atau riwayat tidak dapat dihapus.`,
    showCancelButton: true,
    confirmButtonText: "Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#b91c1c",
  });

  if (!result.isConfirmed) return;

  try {
    const response = await apiRequest("pengguna.php", { method: "POST", body: { action: "delete", id } });
    toast("success", response.message);
    await refresh();
  } catch (error) {
    showError(error, "Gagal Menghapus");
  }
}

/* ===================== Rekap ===================== */

function barRows(entries) {
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return entries.length
    ? entries
        .map(([label, n]) => `<div class="bar-row"><span>${escapeHtml(label)}</span><b>${n}</b><div class="track"><div class="fill" style="width:${(n / max) * 100}%"></div></div></div>`)
        .join("")
    : `<p class="sub">Tidak ada data pada periode ini.</p>`;
}

function renderRekap() {
  if (!can(["admin", "kepsek"])) return;

  const tahunSelect = document.getElementById("rekapTahun");
  const bulanSelect = document.getElementById("rekapBulan");
  const years = new Set([new Date().getFullYear(), ...state.data.semua.map((s) => Number(s.tahun)), ...state.data.suratMasuk.map((m) => Number(m.tahun))]);
  const selectedYear = tahunSelect.value || String(new Date().getFullYear());

  tahunSelect.innerHTML = [...years].sort((a, b) => b - a).map((y) => `<option>${y}</option>`).join("");
  tahunSelect.value = selectedYear;

  if (!bulanSelect.options.length) {
    bulanSelect.innerHTML = `<option value="">Semua bulan</option>${BULAN.map((b, i) => `<option value="${i + 1}">${b}</option>`).join("")}`;
  }

  const year = tahunSelect.value;
  const month = Number(bulanSelect.value);
  const inPeriod = (date) => String(date).startsWith(year) && (!month || Number(String(date).slice(5, 7)) === month);

  const keluar = state.data.semua.filter((s) => inPeriod(s.tanggal_surat));
  const masuk = state.data.suratMasuk.filter((m) => inPeriod(m.tanggal_terima));
  const countStatus = (...statuses) => keluar.filter((s) => statuses.includes(s.status)).length;

  document.getElementById("rekapPeriodePrint").textContent = `${month ? BULAN[month - 1] : "Tahun"} ${year} (dicetak ${formatTanggal(todayIso())})`;

  document.getElementById("rekapStats").innerHTML = [
    statCard(keluar.length, "Surat keluar", "ri-mail-send-line", "primary"),
    statCard(countStatus("disetujui"), "Disetujui", "ri-checkbox-circle-line", "success"),
    statCard(countStatus("dikirim_admin", "diteruskan_kepsek", "revisi_admin", "revisi_kepsek"), "Dalam proses", "ri-time-line", "warning"),
    statCard(countStatus("ditolak_kepsek"), "Ditolak", "ri-close-circle-line", "danger"),
    statCard(masuk.length, "Surat masuk", "ri-inbox-archive-line", "info"),
  ].join("");

  const perJenis = {};
  keluar.forEach((s) => {
    const label = `${s.kode_jenis} - ${s.nama_jenis}`;
    perJenis[label] = (perJenis[label] || 0) + 1;
  });

  document.getElementById("rekapJenis").innerHTML = barRows(Object.entries(perJenis).sort((a, b) => b[1] - a[1]));
  document.getElementById("rekapStatus").innerHTML = barRows(
    Object.entries(STATUS).map(([key, info]) => [info.label, countStatus(key)]).filter(([, n]) => n > 0)
  );

  document.getElementById("tbl-rekap").innerHTML = keluar.length
    ? keluar
        .map((s) => `<tr><td><span class="mono">${escapeHtml(s.kode_surat)}</span></td><td>${escapeHtml(s.judul_surat)}</td><td>${escapeHtml(s.nama_pengaju)}</td>${cellTanggal(s.tanggal_surat)}<td>${statusBadge(s.status)}</td></tr>`)
        .join("")
    : `<tr><td colspan="5" class="empty"><i class="ri-inbox-line"></i>Tidak ada surat keluar pada periode ini.</td></tr>`;
}

/* ===================== Mulai ===================== */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const me = await apiRequest("me.php");
    state.user = me.user;
  } catch {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("userName").textContent = state.user.nama_lengkap;
  document.getElementById("userRole").textContent = ROLE_LABELS[state.user.role];
  document.getElementById("userAvatar").textContent = state.user.nama_lengkap.trim().charAt(0).toUpperCase();
  document.querySelectorAll("[data-roles]").forEach((el) => (el.hidden = !el.dataset.roles.split(",").includes(state.user.role)));

  bindFilters();
  bindForms();
  window.addEventListener("hashchange", navigate);
  navigate();
  await refresh();
});
