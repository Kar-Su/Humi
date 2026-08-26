# Humi — Arsitektur

> Dokumen keputusan. Setiap keputusan besar disertai justifikasi agar tidak
> dibuka-ulang tanpa alasan baru.

## 1. Latar Belakang

Fenomena sosial: menurunnya frekuensi komunikasi tatap muka membuat keterampilan
berbicara menurun — gagap, salah ucap, sulit merangkai kalimat spontan.
Solusi yang dipilih: **Humi — Soul AI Waifu** ber-avatar 3D yang berbahasa Indonesia,
dengan kepribadian energik-playful terinspirasi Hu Tao × Neuro-sama — tempat berlatih
ngobrol tanpa rasa dinilai. Referensi inspirasi: Neuro-sama, Project AIRI, pixiv/ChatVRM.

## 2. Keputusan Arsitektur

| # | Keputusan | Alternatif yang ditolak | Justifikasi |
|---|---|---|---|
| D1 | Platform: web browser | mobile native, desktop native | Render VRM ringan di WebGL/WebGPU; iterasi cepat; bisa dibungkus Tauri/Capacitor nanti tanpa rombak |
| D2 | Avatar: VRM + three-vrm | Live2D, Unity render | Standar terbuka ekosistem VTuber; pipeline React+R3F matang; satu karakter = beban kecil bagi device user |
| D3 | AI: self-hosted zero-cost di laptop dev | cloud API | Unlimited & gratis selama pengembangan; RTX 4060 8GB + i7-14700HX cukup untuk LLM Q4 7-8B |
| D4 | Pembagian komputasi: LLM di GPU, STT/TTS di CPU | semua di GPU | Laptop throttling saat sesi panjang; CPU 20 core sanggup whisper-small int8 & VITS real-time |
| D5 | Topologi: frontend → gateway Go → ai-service Python → ollama | monolith Python | Gateway jadi pintu tunggal (auth/sesi nanti); bahasa sesuai kekuatan masing-masing; topologi dev = topologi produksi |
| D6 | Rust ditunda ke fase optimasi media | Rust sejak awal | Latency < 2 detik tercapai dulu dengan Go+Python; Rust masuk saat tuning streaming audio benar-benar perlu |
| D7 | AIRI sebagai blueprint, bukan fork | fork moeru-ai/airi | Codebase Vue raksasa tak cocok pemula frontend & tujuan Indonesia-first; pola arsitekturnya tetap dipelajari |
| D8 | Lip-sync amplitudo client-side | viseme dari server | Cukup meyakinkan untuk Fase 0; menyederhanakan protokol drastis |
| D9 | Docker compose penuh + network internal `humi-net` | proses native di host | Reproducible; isolasi; hanya frontend/gateway/ollama(loopback) terekspos |
| D10 | Identitas produk: **Soul AI Waifu** (keputusan 2026-08-25) | "AI companion" generik | Positioning tajam ala VTuber culture; persona Hu Tao × Neuro-sama memberi karakter jelas & konsisten; selaras dengan konsep Soul System (Fase 2) |
| D11 | Interim bilingual: suara English via sovits-zeta (2026-08-26) | menunggu TTS ID lolos sebelum lanjut | Kelima jalur TTS ID open-source gagal gerbang (HASIL.md); Zeta lolos telinga untuk EN; pipeline tidak diblokir riset suara — Round 3 di-backlog |

## 3. Diagram

```
[Browser :5173]
 ├─ UI chat + mic capture          ─┐ WebSocket /ws
 └─ Avatar VRM (three-vrm)          │
                                    ▼
                     [gateway (Go) :8080]
                     WS hub · relay · (nanti auth/sesi)
                                    │ humi-net (internal)
                                    ▼
                     [ai-service (FastAPI) :8000]
                      ├─ stt/ faster-whisper small int8   (CPU)
                      ├─ llm/ streaming → Ollama           (GPU)
                      └─ tts/ hasil benchmark-id           (CPU)
                                    │
                                    ▼
                     [ollama :11434 loopback host]
```

Alur satu giliran bicara:
`mic → audio_chunk → stt_final → llm streaming per kalimat (llm_sentence+emotion)
→ tts_start → biner audio → tts_end … turn_end` — semuanya mengalir, bukan request-response.

## 4. Anggaran Latency (< 2 detik)

Lihat skill `benchmark-id` bagian 4. Prinsip: optimasi tahap TERBESAR lebih dulu,
ukur sebelum optimasi, streaming antar semua tahap.

## 5. Risiko Utama

1. **Naturalitas TTS Indonesia** — gerbang paling kritis; benchmark sebelum integrasi (D3 risiko utamanya).
2. **Persona drift** — karakter melenceng saat konteks memanjang; mitigasi via skill persona-prompting.
3. **Thermal throttling laptop** — sesi > 30 menit; mitigasi D4 + monitoring `make status`.
4. **Biaya waktu belajar frontend** — dikendalikan lewat scope UI minimal + pairing penuh dengan agent.

## 6. Yang SENGJAHA Tidak Ada (Fase 0)

Auth, database persisten, memori jangka panjang/vector, multi-user, HTTPS/TLS,
CI/CD, mobile/desktop packaging, fitur coaching/feedback pelafalan.
Semua masuk roadmap bertahap — prinsip "tidak ada pekerjaan buang" tetap terjaga
karena topologi sudah final sejak awal.
