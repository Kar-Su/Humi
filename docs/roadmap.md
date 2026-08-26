# Roadmap — Humi

Gerbang = syarat mutlak lolos sebelum lanjut fase berikut. Gagal gerbang = stop fitur,
fokus perbaiki penyebabnya.

## Fase 0 — Proof of Concept (posisi sekarang)

Tujuan: demo end-to-end di laptop developer — bicara/ketik dari browser,
avatar VRM menjawab bersuara Bahasa Indonesia.

| Step | Deliverable | Status |
|---|---|---|
| 0 | Workflow opencode + docker compose + stub layanan sehat | ✅ selesai |
| 1 | Benchmark TTS Indonesia (gerbang ≥ 3.5) — eSpeech dulu, alternatif via model-ops jika gagal | ⬜ |
| 2 | Pipeline stub→nyata di ai-service: whisper small + Ollama qwen3:8b + TTS terpilih | ⬜ |
| 3 | Gateway relay nyata sesuai protocol-contract v1 | ⬜ |
| 4 | Frontend: chat + mic + avatar VRM + lip-sync amplitudo | ⬜ |
| 5 | Tuning latency streaming per kalimat | ⬜ |
| 6 | Benchmark latency p95 < 2 detik (gerbang) | ⬜ |

**Gerbang keluar Fase 0**: STT WER < 10% · LLM persona ≥ 4.0 · latency p95 < 2s — dalam sesi uji
10 menit tanpa crash. *Gate TTS-ID ditunda sementara (keputusan interim D11: voice English via
sovits-zeta); gate aktif kembali saat kandidat TTS ID baru diuji lewat harness yang sama.*

## Fase 1 — Fondasi Produk

- Postgres: skema user minimal + riwayat percakapan.
- Persona v1 (`persona.py`) + ringkasan memori tiap ~20 giliran.
- Mode teks stabil (tanpa mic) sebagai fallback.
- Pemilihan voice: beberapa kandidat suara dari engine TTS terpilih.
- Voice hunt Round 3: evaluasi Fish Speech/OpenAudio, Orpheus, Chatterbox, F5-TTS ID-finetune,
  Kokoro terbaru via `benchmarks/` harness — target: TTS ID lolos gerbang ≥3.5.
- Gerbang: percakapan 30 menit, karakter konsisten (uji manual + checklist persona).

## Fase 2 — Pengalaman Hidup

- Interupsi natural: user bicara saat avatar bicara → barge-in.
- Streaming TTS antar-kalimat mulus (buffer adaptif).
- Emosi avatar lebih halus (transisi, gestur kepala, idle variety).
- VAD otomatis (tanpa tombol push-to-talk).
- **Soul System v0**: mood & sikap Humi berevolusi dari tanggapan user; nickname
  dinamis yang diciptakan Humi untuk user; memori personalitas (lihat skill persona-prompting).
- Gerbang: sesi santai 15 menit terasa "seperti ngobrol sama makhluk hidup", bukan walkie-talkie.

## Fase 3 — Nilai Tambah & Jangkauan

- Fitur coaching ringan (opsional): deteksi kata fillers ("eee", "aaa"), kecepatan bicara.
- Desktop wrapper Tauri (shell Rust — pintu masuk resmi Rust ke codebase).
- Evaluasi migrasi self-host → hybrid cloud BILA ada target user eksternal.
- Gerbang: keputusan produk — tetap alat personal atau dibuka ke pengguna lain.

## Aturan Perubahan Roadmap

Boleh diubah dengan syarat: tulis alasannya di dokumen ini + tanggal + dampaknya
ke gerbang tetangga. Jangan hapus sejarah keputusan.
