---
name: protocol-contract
description: Kontrak pesan WebSocket antar frontend/gateway/ai-service Humi (tipe pesan, payload, framing biner audio) — single source of truth. Gunakan SETIAP KALI menambah, mengubah, atau membaca tipe pesan WS, payload JSON, framing audio, atau endpoint REST antar layanan.
---

# Protocol Contract

ATURAN KERAS: perubahan kontrak ini wajib mensinkronkan KEEMPAT berkas DALAM SATU COMMIT:

1. `.opencode/skill/protocol-contract/SKILL.md` (berkas ini)
2. tipe TS: `frontend/src/lib/protocol.ts`
3. struct Go: `gateway/internal/protocol/`
4. model Pydantic: `ai-service/app/protocol.py`

Menambah field baru = aman (backward compatible). Mengubah makna/tipe field lama = breaking;
catat di bagian Versi dan koordinasikan migrasi.

## Kanal

Satu koneksi WebSocket client↔gateway: `/ws`. Gateway me-relay ke ai-service
(WebSocket internal `humi-net`). Frontend selalu bicara ke gateway, tidak pernah langsung ke ai-service.

## Pesan Client → Server (JSON text frames)

```json
{"type": "audio_start", "format": "pcm16le", "sample_rate": 16000}
{"type": "audio_chunk", "seq": 1}
{"type": "audio_end"}
{"type": "text", "text": "halo, apa kabar?"}
{"type": "interrupt"}
```

- `audio_chunk`: frame BINER WebSocket, BUKAN base64 JSON. Framing: `[uint32 seq][uint32 len][payload PCM]` little-endian. Field `seq` pada JSON tidak dipakai (reserved).
- `interrupt`: user memotong ucapan avatar; pipeline harus segera stop TTS playback & generation.

## Pesan Server → Client

```json
{"type": "session_ready", "config": {"model": "qwen3:8b", "voice": "default"}}
{"type": "stt_final", "text": "halo, apa kabar?"}
{"type": "llm_sentence", "seq": 1, "text": "Kabar baik!", "emotion": "senang"}
{"type": "tts_start", "seq": 1, "format": "pcm16le", "sample_rate": 24000}
{"type": "tts_end", "seq": 1}
{"type": "turn_end"}
```

- Frame biner audio keluaran memakai framing sama seperti masukan (`[seq][len][payload]`).
- `emotion` ∈ {netral, senang, sedih, kaget, penasaran} — kamus lengkap di skill `persona-prompting`; mapping ke blendshape di skill `avatar-frontend`.
- Satu giliran jawaban = N × (`llm_sentence` → `tts_start` → audio biner → `tts_end`) → ditutup `turn_end`.

## Endpoint REST Internal (gateway ↔ ai-service)

| Endpoint | Metode | Fungsi |
|---|---|---|
| `/health` | GET | healthcheck semua layanan |

## Prinsip Latency

Pipeline wajib streaming: kalimat LLM dikirim ke TTS SEBELUM `turn_end`;
TTS mulai mengirim audio kalimat pertama tanpa menunggu kalimat berikutnya selesai.

## Versi

- v1 (Fase 0): kontrak awal di atas, stub echo di gateway.
