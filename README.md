# UangSaku Pro — Budgeting Pelajar Offline‑First

UangSaku Pro adalah aplikasi web sederhana untuk membantu pelajar mengelola uang saku harian: mencatat pemasukan/pengeluaran, menjaga limit belanja, serta mencapai target tabungan. Aplikasi ini bekerja sepenuhnya di perangkat (on‑device) tanpa akun dan tetap berfungsi saat offline.

## Latar Belakang

Di lingkungan sekolah, pelajar sering kesulitan memantau uang saku karena catatan berserakan, aplikasi keuangan umum membutuhkan akun, dan koneksi internet kadang tidak stabil. Akibatnya pengeluaran menjadi tidak terkontrol dan target menabung sulit tercapai. Dibutuhkan solusi yang:
- Mudah digunakan di perangkat apa pun (HP/laptop sekolah).
- Aman dan menjaga privasi (tanpa server, data lokal).
- Tetap berfungsi tanpa internet (offline‑first) dan bisa di‑install seperti aplikasi.

## Ide Produk

Membangun aplikasi web statis, ringan, dan installable (PWA) yang menyimpan seluruh data di IndexedDB perangkat. Pengguna bisa:
- Mencatat transaksi dan melihat ringkasan visual (Chart.js).
- Menetapkan limit pengeluaran (global/kategori) dengan indikator warna.
- Membuat target tabungan dengan progress bar dan estimasi harian.
- Mengekspor/mengimpor data JSON untuk cadangan dan pindah perangkat.

## Manfaat Utama

- Kontrol pengeluaran pelajar dengan limit dan peringatan visual.
- Transparansi progres menabung hingga mencapai tujuan (misal buku, seragam, perangkat belajar).
- Privasi terjaga: semua data disimpan lokal, tidak ada akun/telemetri.
- Akses mudah dan hemat kuota: install sebagai PWA, bekerja offline.

## Fitur Kunci (Ringkas)

- Dashboard: saldo, total income/expense, 3 grafik (doughnut kategori, cashflow harian, perbandingan bulanan).
- Transaksi: tambah/edit/hapus, filter tanggal/kategori, pencarian cepat.
- Anggaran: limit global & per kategori + indikator status (safe/warn/danger).
- Target: daftar target tabungan, progress bar, estimasi sisa dan saran harian.
- Laporan: ringkasan periode (mingguan/bulanan/custom), siap cetak/ekspor JSON.
- Pengaturan: tema (terang/gelap/auto), mata uang, mode disleksia, kurangi animasi.
- PWA: service worker, manifest, offline fallback.
- Privasi: ekspor/impor data JSON, reset semua data kapan pun.

## Cara Menjalankan (Lokal)

Catatan nama folder: saat Anda mengunduh (Download ZIP) dari GitHub, nama folder biasanya menjadi `UangSaku-Pro-main`. Panduan ini mengasumsikan Anda berada di folder tersebut.

Cara paling mudah (Disarankan untuk pemula) — Live Server di VS Code:

1) Unduh proyek ini (Download ZIP), ekstrak, lalu buka folder `UangSaku-Pro-main` di VS Code.
2) Pasang ekstensi “Live Server” (penerbit: Ritwick Dey) dari Marketplace VS Code.
3) Di panel Explorer, klik kanan `index.html` → pilih “Open with Live Server”.
4) Browser akan terbuka otomatis (alamat biasanya `http://127.0.0.1:5500/` atau mirip) dan aplikasi siap dipakai.

Tips Live Server:
- Jika ikon/fitur offline belum tampil, muat ulang tab. Untuk perubahan besar, Stop lalu Start kembali Live Server.
- Aplikasi ini PWA (ada Service Worker); pertama kali butuh 1–2 detik untuk siap offline.

Alternatif (opsional, untuk yang sudah memasang Node.js):

```bash
# Dari folder UangSaku-Pro-main (root proyek), jalankan salah satu:
npx http-server -p 5173 -c-1 .
# atau
npx serve -l 5173 .

# Lalu buka di browser:
http://localhost:5173/index.html
```

Privasi & penyimpanan data: seluruh data tersimpan lokal di IndexedDB browser Anda. Lakukan ekspor data (JSON) secara berkala sebagai cadangan.

## Cara Menggunakan

- Transaksi
  - Buka halaman Transaksi → klik “+ Transaksi”.
  - Pilih jenis (Pemasukan/Pengeluaran), isi nominal, tanggal, kategori, catatan.
  - Gunakan filter tanggal/kategori/pencarian untuk meninjau data.

- Anggaran
  - Set limit global (mis. 500.000/bulan) dan limit kategori (mis. Makanan 250.000).
  - Pantau indikator: hijau (aman), oranye (mendekati), merah (terlewati).

- Target Tabungan
  - Klik “+ Target”, isi nama, nominal, deadline, dan simpanan awal jika ada.
  - Lihat progress bar, sisa dana, jumlah saran/harinya.
  - Aksi cepat: Edit, Tandai tercapai, atau Hapus.

- Laporan
  - Pilih periode mingguan/bulanan/custom, klik “Buat laporan”.
  - Cetak sebagai PDF via tombol “Cetak / Simpan PDF” atau ekspor JSON.

- Pengaturan & Data
  - Tema (terang/gelap/auto), mata uang, mode disleksia, kurangi animasi.
  - Ekspor data JSON untuk cadangan; impor JSON untuk pemulihan; reset semua data bila diperlukan.

## Aksesibilitas & Desain

- Navigasi keyboard, skip‑link, fokus terlihat, kontras tinggi, mode disleksia.
- Menghormati `prefers-reduced-motion` dan menyediakan toggle internal.

## Teknologi

- HTML/CSS/JS murni, Chart.js (lazy‑load), IndexedDB (on‑device), PWA (SW + manifest).
- Tanpa framework.

## Struktur Proyek

```
UangSaku-Pro-main/
  index.html, budgets.html, transactions.html, goals.html, reports.html, settings.html, offline.html
  css/
    styles.css
  js/
    app.js, ui.js, idb.js
    store-*.js, charts.js, a11y.js, sanitize.js, data-sync.js
    constants.js
  assets/
    icon.svg
  sw.js
  manifest.webmanifest
```
