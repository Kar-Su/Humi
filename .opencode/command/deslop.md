---
description: Membersihkan slop AI dari perubahan branch saat ini — komentar berlebihan, kode defensif aneh, gaya tidak konsisten.
---

Periksa diff perubahan (`git diff main` bila branch tersedia, jika tidak diff commit terakhir), lalu hapus semua slop hasil AI dalam perubahan tersebut:

- Komentar tambahan yang tidak akan ditulis manusia, atau inkonsisten dengan gaya berkas sekitarnya. Aturan proyek: komentar hanya untuk "kenapa", bukan "apa".
- Defensive check atau blok try/except yang abnormal untuk area kode itu — terutama jika dipanggil dari jalur yang sudah tervalidasi.
- Cast `any` di TypeScript yang dipakai untuk menutupi masalah tipe.
- Gaya lain yang tidak konsisten dengan berkasnya.

JANGAN mengubah perilaku. Setelah selesai, jalankan linter terkait (`npm run lint`, `ruff check .`, `go vet ./...`) untuk memastikan tidak ada yang rusak.

Tutup dengan ringkasan 1–3 kalimat saja tentang apa yang diubah.
