---
description: Menjalankan benchmark Bahasa Indonesia (TTS/STT/LLM/latency) sesuai skill benchmark-id dan melaporkan hasil terhadap gerbang keputusan.
---

Jalankan benchmark sesuai argumen: `$ARGUMENTS` (salah satu dari tts | stt | llm | latency,
kosong = tampilkan rencana tanpa mengeksekusi).

Ikuti prosedur lengkap di skill benchmark-id. Untuk setiap komponen yang diuji:

1. Siapkan skrip di `benchmarks/` bila belum ada (korpus sudah dispesifikasikan di skill).
2. Jalankan pengujian, simpan artefak audio/log di `benchmarks/out/<komponen>/`.
3. Nilai menurut rubrik di skill tersebut.
4. Catat hasil ke `benchmarks/HASIL.md` (buat file bila belum ada).

Akhiri dengan tabel ringkasan: komponen | model/engine | skor | target gerbang |
LOLOS/GAGAL — plus rekomendasi langkah berikutnya (lanjut integrasi, atau cari
alternatif via skill model-ops).

$ARGUMENTS
