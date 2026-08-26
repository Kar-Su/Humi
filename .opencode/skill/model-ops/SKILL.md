---
name: model-ops
description: Manajemen model AI self-hosted Humi — operasi Ollama (pull/update/hapus), anggaran VRAM RTX 4060 8GB, kandidat LLM untuk Bahasa Indonesia (Qwen3, SEA-LION, Gemma), varian faster-whisper, inventaris status TTS Indonesia. Gunakan saat pengguna menyebut ganti model, VRAM habis/OOM, pull model, quantization, atau evaluasi model baru.
---

# Model Ops

Prinsip: LLM di GPU (~5GB), STT + TTS di CPU. Laptop throttling saat panjang — jangan tumpuk semua di GPU.
Ganti model default lewat `.env` (`OLLAMA_MODEL`, `WHISPER_MODEL`) lalu `make up` / restart layanan.

## Operasi Ollama

```bash
make pull-models                                  # unduh $OLLAMA_MODEL
docker compose exec ollama ollama pull <model>    # model lain
docker compose exec ollama ollama ls              # daftar tersimpan
docker compose exec ollama ollama rm <model>      # hapus (bebas-kan disk)
docker compose exec ollama ollama ps              # model yang sedang loaded + VRAM
```

Model tersimpan permanen di volume `ollama_data` — aman terhadap `make down`.

## Anggaran VRAM 8 GB

| Model | Quant | VRAM ± | Catatan Bahasa Indonesia |
|---|---|---|---|
| qwen3:8b (DEFAULT) | Q4_K_M | ~5.0 GB | fasih percakapan santai; reasoning mode bisa dimatikan untuk latency |
| sea-lion (AI Singapore) | Q4 | ~5–6 GB | dioptimalkan khusus bahasa Nusantara; kandidat kuat jika Qwen kurang memuaskan |
| gemma3:4b | Q4 | ~3.0 GB | fallback hemat; pakai bila butuh ruang VRAM ekstra |
| qwen3:14b+ | — | >9 GB | TIDAK MUAT di GPU 8GB; jangan coba tanpa strategi offload |

Aturan: sisakan minimal 1 GB VRAM kosong. Jika OOM → turun ukuran/quant, bukan menaikkan swap.

## STT — faster-whisper (CPU)

| Varian | RAM ± | Kualitas id | Rekomendasi |
|---|---|---|---|
| small int8 (DEFAULT) | ~1 GB | baik | mulai di sini; i7-14700HX real-time nyaman |
| medium int8 | ~2.5 GB | lebih baik | hanya jika benchmark WER gagal (lihat `benchmark-id`) |
| large-v3 | — | terbaik | larang di setup ini; CPU tidak real-time |

## TTS Indonesia — Inventaris Status

| Engine | Lisensi | Status | Catatan |
|---|---|---|---|
| **sovits-zeta** ⚠️ DEV-ONLY | fair-use non-komersial (Kit-Lemonfoot) | **INTERIM VOICE OF RECORD** — RTF ±0.25 GPU | Suara English untuk Fase 0–1; wajib kredit; larang distribusi |
| mms-rvc-kobo/zeta ⚠️ DEV-ONLY | idem (megaaziib) | GAGAL — pitch/timbre tak lolos telinga | Hybrid MMS→RVC; runtime rvc-runner py3.10 |
| mms-ind (`facebook/mms-tts-ind`) | **CC-BY-NC 4.0** | GAGAL gerbang — 2.92 datar | Lisensi NON-KOMERSIAL; fonetik ID terbaik → potensial base hybrid |
| piper-id (`id_ID-news_tts-medium`) | open (ONNX) | GAGAL gerbang — 2.92 | Cepat (RTF 0.03) tapi medioker |
| wikidepia JV-00264 | cek repo | GAGAL — defect fonemik `ng`/`l` | Coqui (arsip), checkpoint 346 MB |
| Fish Speech / OpenAudio | cek | **ROUND 3 WATCHLIST** | Generasi baru; verifikasi dukungan `id` dulu |
| Orpheus / Chatterbox / F5-TTS ID-ft / Kokoro | bervariasi | ROUND 3 WATCHLIST | Evaluasi berurutan lewat harness benchmarks/ |

Prosedur evaluasi engine baru: tambah baris di tabel atas → jalankan `benchmark-id`
bagian TTS → update status + catatan HASIL.md.

## Checklist Evaluasi Model Baru

1. Cek lisensi komersial-friendly (untuk masa depan produk).
2. Cek muat di anggaran VRAM/RAM (tabel atas).
3. Jalankan benchmark terkait (`benchmark-id`).
4. Bandingkan latency vs model lama di kondisi sama.
5. Update tabel + `.env.example` + catat di `benchmarks/HASIL.md`.
