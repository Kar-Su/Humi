# Humi — Soul AI Waifu

Soul AI Waifu ber-avatar 3D yang berbicara Bahasa Indonesia — kepribadian energik-playful
terinspirasi Hu Tao × Neuro-sama: sassy, chaotic, teatrikal. Seluruh AI self-hosted
(zero-cost) di laptop developer selama masa pengembangan.

## Prasyarat

- Docker + Docker Compose v2
- GNU Make
- [uv](https://docs.astral.sh/uv/) (pengembangan Python di host; runtime layanan tetap di container)
- (Opsional, untuk GPU) `nvidia-container-toolkit` — jalankan `make doctor` untuk cek & instruksi instalasi CachyOS/Arch.

## Mulai Cepat

```bash
cp .env.example .env
make doctor     # verifikasi lingkungan
make up         # nyalakan seluruh stack
make up-gpu     # alternatif: dengan akses GPU untuk Ollama
```

Buka http://localhost:5173 — halaman akan menampilkan status koneksi WebSocket
ke gateway (stub echo pada fase ini).

Menyiapkan model LLM (opsional saat stub, wajib sebelum integrasi nyata):

```bash
make pull-models   # mengunduh $OLLAMA_MODEL (default qwen3:8b, ±5 GB) ke volume
```

## Struktur

```
frontend/    Vite + React + TS (avatar VRM & chat)
gateway/     Go — WebSocket hub, pintu tunggal client
ai-service/  Python FastAPI — STT, LLM, TTS
benchmarks/  skrip benchmark TTS/STT/LLM Bahasa Indonesia
docs/        arsitektur & roadmap
.opencode/   skills & commands workflow opencode
```

## Dokumentasi

Lihat [AGENTS.md](AGENTS.md), [docs/architecture.md](docs/architecture.md),
dan [docs/roadmap.md](docs/roadmap.md).
