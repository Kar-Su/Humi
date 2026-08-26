---
name: benchmark-id
description: Prosedur benchmark kualitas Bahasa Indonesia untuk Humi — naturalitas TTS (rubrik + korpus kalimat uji), akurasi STT, kualitas persona LLM, dan pengukuran latency pipeline < 2 detik. Gunakan saat pengguna menyebut benchmark, evaluasi model, uji kualitas suara, latency, atau gerbang keputusan fase.
---

# Benchmark Bahasa Indonesia

Semua hasil benchmark dicatat di `benchmarks/HASIL.md` (buat saat menjalankan pertama kali)
dengan format tabel: tanggal | komponen | versi/model | skor | catatan. Keputusan ganti engine
WAJIB didukung angka dari sini.

## 1. TTS — Naturalitas (gerbang paling kritis)

Korpus uji baku `benchmarks/korpus_tts.txt` — 12 kalimat mencakup: formal, percakapan santai,
slang ringan, angka & tanggal, serapan asing (download, app), tanda tanya/bisa, kalimat panjang.

Prosedur per engine:
1. Sintesakan seluruh korpus → simpan WAV di `benchmarks/out/<engine>/`.
2. Dengarkan berurutan; nilai tiap kalimat dengan rubrik:
   - **5** = sulit dibedakan dari manusia; intonasi wajar.
   - **4** = natural, sedikit robotik pada intonasi akhir.
   - **3** = jelas sintetis tapi nyaman didengar.
   - **2** = robotik; pelafalan serapan asing salah.
   - **1** = ada kata yang gagal dilafalkan / artefak parah.
3. Catat juga RTF (real-time factor): durasi sintesis ÷ durasi audio. Target RTF < 0.5 di CPU.
4. Skor engine = rata-rata. **Gerbang Fase 0: rata-rata ≥ 3.5 dan tidak ada skor 1.**

## 2. STT — Akurasi

Pakai 10 rekaman bacaan manual dari korpus (bisa rekam sendiri via browser mic).
Ukur WER manual pada 50 kata pertama. Target WER < 10% untuk `faster-whisper small int8`.
Jika > 10%, naikkan ke `medium` hanya bila CPU masih sanggup real-time (cek skill `model-ops`).

## 3. LLM — Kefasihan Persona

Skrip `benchmarks/llm_chat.py` mengirim 8 giliran percakapan skenario (sapaan, curhat ringan,
ledek, pertanyaan fakta, permintaan saran) langsung ke Ollama. Nilai manual per kriteria 1–5:
konsistensi persona, kefasihan Indonesia (tanpa campur bahasa aneh), empati, kelucuan, ketidakformalan yang pas.
**Gerbang: rata-rata ≥ 4.0.** Jika gagal → coba kandidat lain di skill `model-ops` sebelum utak-atik prompt.

## 4. Latency Pipeline (< 2 detik)

Ukur dengan timestamp event di log gateway. Anggaran per tahap:

| Tahap | Anggaran |
|---|---|
| STT final setelah user diam | ≤ 600 ms |
| LLM token pertama | ≤ 500 ms |
| Audio TTS kalimat pertama siap play | ≤ 500 ms |
| Relay gateway→client | ≤ 100 ms |
| **Total (mulai bicara avatar)** | **≤ 1700 ms** |

Sisanya (300 ms) adalah buffer jitter. Gerbang Fase 0: p95 total < 2000 ms dalam sesi 10 menit.
Jika lewat, potong di tahap terbesar dulu — JANGAN optimasi buta.

## Aturan Gerbang

Gerbang gagal = STOP integrasi fitur baru; fokuskan penelitian alternatif (skill `model-ops`).
Dokumentasikan keputusan lolos/gagal di `docs/roadmap.md`.
