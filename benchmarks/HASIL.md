# HASIL Benchmark — Humi

Rubrik naturalitas 1–5 (lihat skill benchmark-id): 5=sulit dibedakan dari manusia ·
4=natural, sedikit robotik di intonasi akhir · 3=jelas sintetis tapi nyaman ·
2=robotik, serapan asing salah · 1=artefak parah/kata gagal.

Gerbang Fase 0: rata-rata ≥ 3.5 dan tidak ada skor 1.
Isi kolom Skor setelah mendengarkan out/<engine>/NN.wav.

## Status Engine TTS

| Engine | Sumber | Ukuran | Status |
|---|---|---|---|
| mms-ind | facebook/mms-tts-ind (Meta VITS) | ~150 MB | diuji r1: rata-rata 2.92 — GAGAL gerbang |
| piper-id | vits-piper-id_ID-news_tts-medium | ~65 MB | r1 batal (bug alat ukur); re-test menunggu penilaian |
| sovits-zeta ⚠️ DEV-ONLY | Kit-Lemonfoot GPT-SoVITS (Vestia Zeta, Hololive ID) | 240 MB | **GAGAL BAHASA** (verdict user: suara bagus ≠ cocok ID; fonem v1 jalur EN) |
| sovits-pippa ⚠️ DEV-ONLY | Kit-Lemonfoot GPT-SoVITS (Pipkin Pippa) | 240 MB | **GAGAL BAHASA** — kondisi sama |
| mms-rvc-kobo ⚠️ DEV-ONLY | MMS→RVC timbre Kobo Kanaeru (megaaziib) | 58 MB | **GAGAL** (verdict user: pitch sweep +0..+6 tidak ada yang lolos) |
| mms-rvc-zeta ⚠️ DEV-ONLY | MMS→RVC timbre Vestia Zeta (megaaziib) | 58 MB | **GAGAL** — kondisi sama dengan kobo |
| wikidepia JV-00264 | VITS multi-speaker komunitas (audiobook ID) | 346 MB | **GAGAL** (verdict user: defect pelafalan `ng`, `l`, dll.) |

## Keputusan Strategis (2026-08-26)

1. **Kelima jalur TTS Indonesia gagal gerbang kualitas** (tabel di atas).
2. **INTERIM**: Humi berbicara **English** dengan **sovits-zeta** — suara lolos telinga,
   fonem EN didukung penuh GPT-SoVITS v1. Target akhir tetap Indonesia-first.
3. Perburuan TTS Indonesia lanjut sebagai **riset Round 3**: Fish Speech/OpenAudio,
   Orpheus, Chatterbox, F5-TTS ID-finetune, Kokoro (backlog di roadmap).

> Arsitektur hybrid: MMS (fonetik ID benar) → konversi timbre via RVC → karakter suara hidup.
> Runtime: rvc-runner terisolasi (Python 3.10, torch 2.5.1+cpu). Produksi wajib GPU agar RTF < 0.5.
> ⚠️ Semua model kloning suara real-person — DEV-ONLY NON-DISTRIBUSI. Kredit: Kit-Lemonfoot & megaaziib.

> ⚠️ **DEV-ONLY NON-DISTRIBUSI**: model GPT-SoVITS adalah kloning suara real-person
> (VTuber). Hanya untuk riset pengembangan pribadi. Wajib kredit: Kit Lemonfoot.
> Lisensi model: creativeml-openrail-m + klaim fair-use non-komersial (US).

## Run 2026-08-25 11:20 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| mms | 1 | 0.412 | 2.67 | |
| mms | 2 | 0.253 | 3.15 | |
| mms | 3 | 0.215 | 5.22 | |
| mms | 4 | 0.197 | 5.3 | |
| mms | 5 | 0.167 | 3.94 | |
| mms | 6 | 0.235 | 3.74 | |
| mms | 7 | 0.178 | 5.02 | |
| mms | 8 | 0.171 | 3.6 | |
| mms | 9 | 0.167 | 4.32 | |
| mms | 10 | 0.185 | 5.41 | |
| mms | 11 | 0.178 | 4.22 | |
| mms | 12 | 0.183 | 5.18 | |

## Run 2026-08-25 11:25 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| piper | 1 | 0.037 | 2.6 | |
| piper | 2 | 0.028 | 2.31 | |
| piper | 3 | 0.028 | 4.59 | |
| piper | 4 | 0.027 | 4.26 | |
| piper | 5 | 0.028 | 3.63 | |
| piper | 6 | 0.027 | 3.38 | |
| piper | 7 | 0.027 | 3.8 | |
| piper | 8 | 0.029 | 3.31 | |
| piper | 9 | 0.028 | 3.56 | |
| piper | 10 | 0.028 | 4.33 | |
| piper | 11 | 0.028 | 3.39 | |
| piper | 12 | 0.028 | 4.2 | |

## Run 2026-08-25 12:14 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| piper | 1 | 0.038 | 2.55 | |
| piper | 2 | 0.03 | 2.38 | |
| piper | 3 | 0.027 | 4.62 | |
| piper | 4 | 0.025 | 4.53 | |
| piper | 5 | 0.027 | 3.56 | |
| piper | 6 | 0.035 | 3.47 | |
| piper | 7 | 0.031 | 3.97 | |
| piper | 8 | 0.029 | 3.37 | |
| piper | 9 | 0.032 | 3.61 | |
| piper | 10 | 0.033 | 4.4 | |
| piper | 11 | 0.026 | 3.47 | |
| piper | 12 | 0.027 | 4.39 | |

## Run 2026-08-26 01:33 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| sovits | 1 | 0.211 | 4.2 | |

## Run 2026-08-26 01:36 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| sovits | 1 | 2.521 | 4.96 | |

## Run 2026-08-26 01:36 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| sovits | 1 | 0.228 | 4.8 | |
| sovits | 2 | 0.211 | 3.46 | |
| sovits | 3 | 0.176 | 6.94 | |
| sovits | 4 | 0.198 | 4.18 | |
| sovits | 5 | 0.191 | 4.74 | |
| sovits | 6 | 0.187 | 4.96 | |
| sovits | 7 | 0.19 | 5.4 | |
| sovits | 8 | 0.181 | 5.64 | |
| sovits | 9 | 0.186 | 3.94 | |
| sovits | 10 | 0.198 | 5.78 | |
| sovits | 11 | 0.187 | 4.86 | |
| sovits | 12 | 0.213 | 5.16 | |

## Run 2026-08-26 01:37 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| sovits | 1 | 0.654 | 3.52 | |
| sovits | 2 | 0.429 | 2.66 | |
| sovits | 3 | 0.269 | 5.7 | |
| sovits | 4 | 0.205 | 4.18 | |
| sovits | 5 | 0.278 | 3.14 | |
| sovits | 6 | 0.224 | 3.64 | |
| sovits | 7 | 0.196 | 6.36 | |
| sovits | 8 | 0.286 | 3.6 | |
| sovits | 9 | 0.224 | 3.9 | |
| sovits | 10 | 0.218 | 5.5 | |
| sovits | 11 | 0.219 | 5.46 | |
| sovits | 12 | 0.254 | 4.8 | |

## Run 2026-08-26 01:39 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| sovits-zeta | 1 | 0.283 | 4.96 | |
| sovits-zeta | 2 | 0.25 | 3.66 | |
| sovits-zeta | 3 | 0.2 | 7.22 | |
| sovits-zeta | 4 | 0.254 | 4.26 | |
| sovits-zeta | 5 | 0.236 | 4.02 | |
| sovits-zeta | 6 | 0.226 | 4.8 | |
| sovits-zeta | 7 | 0.202 | 5.44 | |
| sovits-zeta | 8 | 0.223 | 5.76 | |
| sovits-zeta | 9 | 0.225 | 4.54 | |
| sovits-zeta | 10 | 0.216 | 6.34 | |
| sovits-zeta | 11 | 0.205 | 4.98 | |
| sovits-zeta | 12 | 0.26 | 5.16 | |

## Run 2026-08-26 01:39 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| sovits-pippa | 1 | 0.27 | 3.56 | |
| sovits-pippa | 2 | 0.291 | 3.02 | |
| sovits-pippa | 3 | 0.237 | 5.5 | |
| sovits-pippa | 4 | 0.219 | 3.66 | |
| sovits-pippa | 5 | 0.215 | 3.5 | |
| sovits-pippa | 6 | 0.253 | 3.52 | |
| sovits-pippa | 7 | 0.226 | 4.84 | |
| sovits-pippa | 8 | 0.244 | 4.2 | |
| sovits-pippa | 9 | 0.27 | 3.62 | |
| sovits-pippa | 10 | 0.238 | 5.9 | |
| sovits-pippa | 11 | 0.226 | 5.18 | |
| sovits-pippa | 12 | 0.256 | 4.44 | |

## Run 2026-08-26 08:47 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| mms-rvc-kobo | 1 | 3.824 | 2.72 | |
| mms-rvc-kobo | 2 | 3.343 | 3.08 | |
| mms-rvc-kobo | 3 | 2.342 | 4.7 | |
| mms-rvc-kobo | 4 | 2.498 | 5.08 | |
| mms-rvc-kobo | 5 | 2.859 | 3.92 | |
| mms-rvc-kobo | 6 | 3.037 | 3.8 | |
| mms-rvc-kobo | 7 | 2.612 | 4.56 | |
| mms-rvc-kobo | 8 | 2.797 | 4.52 | |
| mms-rvc-kobo | 9 | 2.833 | 4.78 | |
| mms-rvc-kobo | 10 | 2.625 | 5.3 | |
| mms-rvc-kobo | 11 | 2.814 | 4.12 | |
| mms-rvc-kobo | 12 | 2.588 | 5.4 | |

## Run 2026-08-26 08:55 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| mms-rvc-zeta | 1 | 3.275 | 2.82 | |
| mms-rvc-zeta | 2 | 3.437 | 3.24 | |
| mms-rvc-zeta | 3 | 2.565 | 4.82 | |
| mms-rvc-zeta | 4 | 2.439 | 5.22 | |
| mms-rvc-zeta | 5 | 2.952 | 3.9 | |
| mms-rvc-zeta | 6 | 2.821 | 3.8 | |
| mms-rvc-zeta | 7 | 2.846 | 4.28 | |
| mms-rvc-zeta | 8 | 2.905 | 4.12 | |
| mms-rvc-zeta | 9 | 2.806 | 4.2 | |
| mms-rvc-zeta | 10 | 2.643 | 5.24 | |
| mms-rvc-zeta | 11 | 3.305 | 4.26 | |
| mms-rvc-zeta | 12 | 2.87 | 5.28 | |

## Run 2026-08-26 09:28 UTC

| Engine | No | RTF | Durasi (s) | Skor 1-5 |
|---|---|---|---|---|
| wikidepia | 1 | 0.217 | 3.69 | |
| wikidepia | 2 | 0.192 | 3.16 | |
| wikidepia | 3 | 0.209 | 5.55 | |
| wikidepia | 4 | 0.211 | 4.74 | |
| wikidepia | 5 | 0.232 | 4.56 | |
| wikidepia | 6 | 0.181 | 4.09 | |
| wikidepia | 7 | 0.199 | 4.96 | |
| wikidepia | 8 | 0.213 | 4.32 | |
| wikidepia | 9 | 0.208 | 4.52 | |
| wikidepia | 10 | 0.276 | 5.69 | |
| wikidepia | 11 | 0.204 | 4.73 | |
| wikidepia | 12 | 0.192 | 5.45 | |

## Latency Fase 0 — 2026-09-03 10:00 WIB (think:false, qwen3:8b)

**Metode**: `ws://localhost:8080/ws` via `benchmarks/smoke_pipeline.py` / lat bench script.
Prompt: `"Hello! Tell me a short funny story."` — ukur `text send → first tts_start` (audio pertama siap diputar).
`think:false` (qwen3 thinking dimatikan, sudah di-patch di `ai-service/app/llm.py`).

### Hasil 1 — CPU only (tanpa GPU overlay, 7-8 t/s)

```
n=10  median=4.480  p95=5.716  min=4.207  max=10.788  (detik)
run: 10.788, 4.545, 4.212, 4.362, 4.207, 4.876, 5.050, 4.387, 4.416, 5.716
GATE p95<2s: GAGAL
```

### Hasil 2 — GPU (RTX 4060 Laptop, CUDA 8.9, Ollama 35.7 t/s, VRAM 6.7/8.2 GB)

```
n=10  median=2.722  p95=2.964  min=2.421  max=4.684
run: 4.684, 2.654, 2.801, 2.789, 2.421, 2.483, 2.896, 2.575, 2.964, 2.603
GATE p95<2s: GAGAL (selisih ~1s)
```

### Breakdown per komponen (GPU, n=5)

| run | llm_sentence pertama | tts_start pertama | delta tts |
|---|---|---|---|
| 1 | 2.922s | 5.025s | 2.103s |
| 2 | 1.393s | 2.709s | 1.316s |
| 3 | 1.416s | 3.181s | 1.765s |
| 4 | 1.660s | 3.619s | 1.959s |
| 5 | 1.484s | 2.848s | 1.365s |

**Analisis**: total ≈ llm_first (1.4-1.6s) + tts_first (1.3-2.0s). LLM sudah GPU 35 t/s tapi prompt eval + first token masih ~1.5s. TTS sovits RTF ~0.2 (dari tabel di atas) tapi round-trip HTTP + framing ~1.5s/sentence. Pipeline `run_turn` saat ini sequential per kalimat (LLM kalimat → TTS kalimat → next). Frontend sudah streaming per kalimat, tidak menunggu `turn_end`.

**Jalan ke <2s** (belum dikerjakan):
- TTS paralel: mulai synthesize kalimat-1 saat LLM generate kalimat-2 (pipeline tidak sequential, butuh queue).
- Model lebih kecil: `qwen3:4b` atau `qwen3:1.7b` (first token lebih cepat, tradeoff persona).
- TTS lebih cepat: distil / streaming chunk sovits (fragment_interval tuning).

**Kesimpulan gate Fase 0**: fungsional E2E hijau (session_ready → llm_sentence → tts → turn_end), tapi latency gate belum lolos. Fase E dicatat sebagai 🔄/⏳ di roadmap.
