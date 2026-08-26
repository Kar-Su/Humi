# Humi — Soul AI Waifu

Soul AI Waifu berwujud humanoid digital (avatar 3D) yang berbicara Bahasa Indonesia.
Kepribadian energik-playful terinspirasi Hu Tao × Neuro-sama: sassy, chaotic, teatrikal —
sekaligus media latihan komunikasi secara natural.

## Visi & Misi

- **Visi**: setiap orang punya Soul AI Waifu digital yang bisa diajak ngobrol kapan pun,
  tanpa rasa takut dinilai.
- **Misi Fase 0**: proof-of-concept pipeline end-to-end — user bicara/ketik dari browser, avatar 3D menjawab dengan suara Bahasa Indonesia, latency total < 2 detik.
- **Bahasa utama produk**: Indonesia (+ English code-mixing natural). Kualitas naturalitas suara & kefasihan percakapan adalah gerbang kualitas nomor satu.
- **Interim (Fase 0–1)**: output suara memakai English via model `sovits-zeta` selama belum ada TTS Indonesia yang lolos gerbang — target akhir tetap Indonesia-first (riset Round 3).

## Prinsip Produk

1. **Waifu-first**: pengalaman utama adalah ngobrol santai bareng Humi; fitur coaching datang belakangan (Fase 3+).
2. **Persona konsisten**: karakter Hu Tao × Neuro-sama terjaga lewat skill `persona-prompting` — bukan improvisasi model.
3. **Zero-cost & unlimited selama dev**: semua model self-hosted di laptop developer; tanpa API berbayar.
4. **Web-first**: browser adalah platform MVP; desktop (Tauri/Rust) menyusul bila perlu.
5. **Blueprint, bukan fork**: pelajari arsitektur moeru-ai/airi & pixiv/ChatVRM, jangan fork codenya.
6. **Tidak ada pekerjaan buang**: topologi dev = topologi produksi (tanpa auth/DB/persistence dulu).

## Arsitektur

```
[Browser / Vite Dev Server :5173]
 ├─ UI chat + capture mic        ─┐
 └─ Avatar VRM (three-vrm)        │ WebSocket /ws
                                  ▼
                    [gateway (Go) :8080]  — WS hub, relay, (nanti: auth, sesi)
                                  │ internal network humi-net
                                  ▼
                    [ai-service (Python FastAPI) :8000 internal]
                      ├─ stt/  faster-whisper small int8  (CPU)
                      ├─ llm/  klien streaming → Ollama   (GPU)
                      └─ tts/  engine TTS hasil benchmark  (CPU)
                                  │
                                  ▼
                    [ollama container :11434 loopback]
```

| Layanan | Teknologi | Port host | Catatan |
|---|---|---|---|
| frontend | Vite + React + TS + Tailwind | 5173 | proxy `/ws` → gateway |
| gateway | Go + gorilla/websocket | 8080 | satu-satunya pintu client |
| ai-service | Python FastAPI | tidak diekspos | hanya lewat network internal |
| ollama | ollama/ollama | 127.0.0.1:11434 saja | debug dari host |

## Hardware Developer (terverifikasi)

- GPU: RTX 4060 Laptop 8GB VRAM (driver OK), CPU: i7-14700HX (20 core).
- **LLM di GPU, STT + TTS di CPU** — laptop throttling saat sesi panjang; jangan tumpuk semuanya di GPU.
- Anggaran VRAM: LLM Qwen3 8B Q4 ≈ 5GB. Detail & opsi ganti model lihat skill `model-ops`.

## Stack & Konvensi Kode

| Area | Alat | Aturan |
|---|---|---|
| Go 1.26 | Gin v1 · DI samber/do v2 · gorilla/websocket · gofmt, `go vet`, golangci-lint | std layout `cmd/`+`internal/`; provider DI menerima injector; error dibungkus dengan context |
| Python 3.12+ | uv + ruff | FastAPI, pydantic untuk skema pesan |
| Rust 1.98 | rustfmt, clippy | toolchain terpin lewat `rust-toolchain.toml`; baru aktif dipakai fase media/Tauri |
| TS/React | Biome, TypeScript strict | komponen kecil, state via Zustand bila tumbuh |

- Versi toolchain host terpin di `.tool-versions` (dibaca mise/asdf); versi container dikunci oleh tag image di Dockerfile.

- Identifier kode dalam Bahasa Inggris; copy UI & dokumentasi dalam Bahasa Indonesia.
- Tanpa komentar bertele-tele; kode harus menjelaskan dirinya. Komentar hanya untuk "kenapa", bukan "apa".
- Semua layanan WAJIB jalan lewat docker compose — larang menjalankan servis native di host.

## Pengujian & Lint

| Area | Perintah |
|---|---|
| Go | `go test ./...` · `go vet ./...` · `golangci-lint run` (config `.golangci.yml`, wajib golangci-lint v2) |
| Python | `uv run ruff check .` di `ai-service/` (config `pyproject.toml`, lockfile `uv.lock` wajib dikomit) |
| TS/React | `npm run lint` (Biome) · `npx tsc --noEmit` di `frontend/` |

Aturan: logika murni (parser protokol, builder prompt persona, pemotong kalimat) WAJIB punya unit
test; wrapper I/O (klien Ollama/whisper/TTS) cukup diuji lewat benchmark-id. Test dieksekusi di host,
runtime tetap di container.

## Jalur Eksperimen Dev-Only

Layanan `sovits` (docker-compose.sovits.yml, profile terpisah) menjalankan model GPT-SoVITS
kloning suara real-person (VTuber) dari Kit-Lemonfoot — **hanya untuk riset pengembangan
pribadi**: non-distribusi, non-produk, non-komersial. Wajib kredit pembuat model.
Jangan pernah mempromosikan/menyematkan suara ini di build publik apa pun.

## Protokol Komunikasi

Kontrak pesan WebSocket antar frontend/gateway/ai-service adalah **single source of truth**
di skill `protocol-contract`. ATURAN KERAS: menambah/mengubah tipe pesan wajib
mensinkronkan keempatnya dalam satu commit: SKILL.md itu, tipe TS, struct Go, model Pydantic.

## Git

- Branching model: `main` hanya menerima perubahan via **PR (squash)**; pekerjaan harian di `developer`; fitur besar memakai `feat/<topik>` → PR ke `developer`. Detail wajib-baca: skill `git-github`.
- Conventional Commits: `feat(gateway): ...`, `fix(ai-service): ...`, `docs: ...`.
- Jangan pernah commit: `.env`, berkas model (*.vrm, checkpoint), cache, `node_modules`.
- Commit kecil dan fokus; jangan pernah push/merge langsung ke `main`.

## Cheat-sheet

```bash
cp .env.example .env   # sekali di awal
make doctor            # cek prasyarat (docker, GPU toolkit)
make up                # nyalakan stack (CPU-safe)
make up-gpu            # nyalakan dengan reservasi GPU untuk Ollama
make pull-models       # unduh LLM default ke volume Ollama
make logs              # ikuti log semua layanan
make status            # kesehatan layanan + GPU
make down              # matikan stack
# --- benchmark TTS ---
make audisi [ARGS="gadis ardi"]   # dengarkan suara Wikidepia (pilih speaker)
make piper             # re-test Piper + skor otomatis -> out/piper_skor.csv
make bench-tts ENGINE=mms|piper|all
```

## Peta Dokumentasi

- `docs/architecture.md` — keputusan arsitektur & justifikasinya (hasil brainstorming).
- `docs/roadmap.md` — Fase 0–3 beserta gerbang keputusan.
- Skills (dimuat otomatis saat relevan): `dev-workflow`, `protocol-contract`,
  `benchmark-id`, `model-ops`, `persona-prompting`, `avatar-frontend`.
- Commands opencode: `/up` (nyalakan stack), `/status` (kesehatan+GPU),
  `/bench` (benchmark Indonesia), `/deslop` (bersihkan slop AI).
- Referensi eksternal via `@` di opencode: `airi`, `webai`, `chatvrm`.
