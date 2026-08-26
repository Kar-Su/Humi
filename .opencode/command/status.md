---
description: Memeriksa kesehatan seluruh layanan stack plus kondisi GPU/VRAM.
---

Periksa kondisi stack saat ini:

1. `docker compose ps` — status tiap container.
2. Health endpoint: `curl -s http://localhost:8080/health`,
   `docker compose exec ai-service python -c "import urllib.request as u; print(u.urlopen('http://localhost:8000/health').read().decode())"`.
3. GPU: `nvidia-smi --query-gpu=name,memory.used,memory.total,temperature.gpu --format=csv,noheader`
   bila tersedia. Bandingkan pemakaian VRAM dengan anggaran di skill model-ops.
4. Model Ollama yang loaded: `docker compose exec ollama ollama ps`.

Sajikan ringkasan tabel: layanan | status | catatan. Tandai anomali
(container restarting, VRAM > 7GB, suhu > 85C) beserta saran tindak lanjut.

$ARGUMENTS
