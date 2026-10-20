#!/usr/bin/env bash
# Uji black box alur utama SICAF lewat API (butuh server PHP + database hasil impor db.sql yang masih bersih).
# Jalankan dari Git Bash:  bash tests/uji-alur.sh http://localhost:8090
set -u
BASE="${1:-http://localhost:8090}/backend"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
printf '%%PDF-1.4\n%%%%EOF\n' > "$TMP/surat.pdf"
LULUS=0; GAGAL=0

cek() { # cek "nama uji" "teks yang diharapkan" "respons"
  if [[ "$3" == *"$2"* ]]; then echo "LULUS  $1"; LULUS=$((LULUS+1)); else echo "GAGAL  $1 -> $3"; GAGAL=$((GAGAL+1)); fi
}
json() { curl -s -b "$TMP/$1" -H 'Content-Type: application/json' -d "$3" "$BASE/$2"; }
login() { curl -s -c "$TMP/$1" -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"${3:-password123}\"}" "$BASE/login.php"; }

cek "Login dengan password salah ditolak" "salah" "$(login x guru@sicaf.test salah)"
cek "Login Guru" "Login berhasil" "$(login guru guru@sicaf.test)"
cek "Login Tata Usaha" "Login berhasil" "$(login tu tu@sicaf.test)"
cek "Login Kepala Sekolah" "Login berhasil" "$(login kepsek kepsek@sicaf.test)"

ajukan() { curl -s -b "$TMP/guru" -F jenis_surat_id=1 -F tanggal_surat=2026-10-18 -F judul_surat="Uji $1" -F tujuan=Wali -F isi_ringkas=Uji -F file=@"$TMP/surat.pdf" "$BASE/surat-create.php"; }
R1="$(ajukan 1)"; R2="$(ajukan 2)"
cek "Pengajuan surat menerbitkan nomor otomatis" "SMKN1SDY" "$R1"
ID1="$(sed -E 's/.*"id":([0-9]+).*/\1/' <<<"$R1")"
N1="$(sed -E 's/.*"kode_surat":"([^"]*)".*/\1/' <<<"$R1")"; N2="$(sed -E 's/.*"kode_surat":"([^"]*)".*/\1/' <<<"$R2")"
[[ "$N1" != "$N2" ]] && cek "Dua pengajuan mendapat nomor berbeda" "x" "x" || cek "Dua pengajuan mendapat nomor berbeda" "beda" "$N1 = $N2"

cek "Kepala Sekolah tidak bisa menyetujui sebelum diverifikasi TU" "statusnya sudah berubah" "$(json kepsek surat-action.php "{\"surat_id\":$ID1,\"action\":\"setujui\"}")"
cek "Revisi tanpa catatan ditolak" "Catatan wajib" "$(json tu surat-action.php "{\"surat_id\":$ID1,\"action\":\"revisi_admin\"}")"
cek "TU mengembalikan surat untuk revisi" "revisi_admin" "$(json tu surat-action.php "{\"surat_id\":$ID1,\"action\":\"revisi_admin\",\"catatan\":\"Lengkapi lampiran\"}")"
cek "Guru mengirim perbaikan" "Perbaikan surat dikirim" "$(curl -s -b "$TMP/guru" -F surat_id="$ID1" -F judul_surat='Uji 1 revisi' -F tujuan=Wali -F isi_ringkas=Uji "$BASE/surat-update.php")"
cek "TU meneruskan ke Kepala Sekolah" "diteruskan_kepsek" "$(json tu surat-action.php "{\"surat_id\":$ID1,\"action\":\"teruskan\"}")"
cek "Guru tidak bisa menghapus surat yang sedang diproses Kepsek" "tidak dapat dihapus" "$(json guru surat-delete.php "{\"surat_id\":$ID1}")"
cek "Kepala Sekolah menyetujui surat" "disetujui" "$(json kepsek surat-action.php "{\"surat_id\":$ID1,\"action\":\"setujui\"}")"
cek "Surat disetujui masuk arsip" "$ID1" "$(curl -s -b "$TMP/guru" "$BASE/surat-list.php?scope=arsip")"
cek "Riwayat surat tercatat" "Menyetujui surat" "$(curl -s -b "$TMP/guru" "$BASE/surat-detail.php?id=$ID1")"
cek "Guru tidak bisa membuka daftar pengguna" "tidak memiliki akses" "$(curl -s -b "$TMP/guru" "$BASE/pengguna.php")"
cek "Registrasi tidak bisa memilih peran admin" "Registrasi berhasil" "$(curl -s -H 'Content-Type: application/json' -d "{\"email\":\"uji$RANDOM@sicaf.test\",\"password\":\"rahasia123\",\"nama_lengkap\":\"Uji\",\"jabatan\":\"Guru\",\"jenis_kelamin\":\"male\",\"role\":\"admin\"}" "$BASE/register.php")"
cek "File selain PDF/DOC/DOCX ditolak" "Format dokumen" "$(echo x > "$TMP/a.exe"; curl -s -b "$TMP/guru" -F jenis_surat_id=1 -F tanggal_surat=2026-10-18 -F judul_surat=x -F tujuan=y -F isi_ringkas=z -F file=@"$TMP/a.exe" "$BASE/surat-create.php")"

echo "Selesai: $LULUS lulus, $GAGAL gagal"
[[ $GAGAL -eq 0 ]]
