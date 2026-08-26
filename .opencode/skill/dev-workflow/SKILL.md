---
name: dev-workflow
description: Operasional stack docker compose proyek Humi — menyalakan/mematikan layanan, membaca log, triage error umum, cek GPU. Gunakan saat pengguna menyebut compose, make, jalankan stack, log error, port bentrok, ollama tidak jalan, atau GPU tidak terdeteksi.
---

# Dev Workflow

Semua layanan WAJIB berjalan lewat docker compose. Larang menjalankan servis native di host.

## Perintah Harian

| Tujuan | Perintah |
|---|---|
| Nyalakan (CPU-safe) | `make up` |
| Nyalakan dengan GPU | `make up-gpu` |
| Matikan | `make down` |
| Log semua / satu layanan | `make logs` / `docker compose logs -f gateway` |
| Status + GPU | `make status` |
| Rebuild satu layanan setelah ubah kode | `docker compose up -d --build <layanan>` |
| Eksekusi perintah dalam layanan | `docker compose exec <layanan> sh` |

## Peta Layanan & Port

- frontend → host :5173 (Vite dev server, bind mount ./frontend untuk hot-reload)
- gateway → host :8080 (satu-satunya pintu client; frontend memanggil via proxy `/ws`)
- ai-service → internal saja (:8000 di network `humi-net`, TIDAK diekspos ke host)
- ollama → host 127.0.0.1:11434 (loopback, hanya debug)

Komunikasi antar layanan pakai DNS compose: `http://ai-service:8000`, `http://ollama:11434`.

## Triage Error Umum

1. **Port already in use** → cek pemakai: `ss -ltnp | grep <port>`; ubah port lewat `.env`.
2. **GPU tidak muncul di container ollama** → jalankan `make doctor`; biasanya
   nvidia-container-toolkit belum terpasang/konfigurasi. Setelah instal:
   `sudo systemctl restart docker` lalu `make up-gpu`. Tanpa GPU stack tetap hidup (CPU).
3. **ai-service lambat saat pertama kali** → model whisper/TTS sedang diunduh ke volume
   `hf_cache`. Pantau log; unduhan hanya sekali.
4. **frontend node_modules rusak** → `docker compose down && docker volume rm humi_frontend_node_modules && make up`.
5. **Ollama OOM / model gagal load** → VRAM habis; lihat skill `model-ops` untuk turunkan ukuran model.
6. **Laptop panas/throttling** → normal pada sesi panjang; pastikan STT+TTS di CPU,
   LLM saja di GPU (lihat AGENTS.md bagian hardware).

## Urutan Ketergantungan

ollama → ai-service → gateway → frontend (healthcheck mengatur urutan otomatis).
Jika satu layanan unhealthy, naikkan rantai dari hulu: cek `docker compose ps`,
lalu log layanan paling hulu yang merah.
