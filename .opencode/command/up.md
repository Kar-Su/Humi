---
description: Menyalakan stack Humi dan memverifikasi kesehatan semua layanan.
---

Nyalakan stack dengan langkah berikut:

1. Jalankan `make doctor` untuk mendeteksi prasyarat.
2. - Jika ada code yang berubah -> `make build`
   - Jika ingin menjalankan local -> `make up` .
   - Jika ingin menjalankan local -> `make up-prod` .
2. Pantau `docker compose ps` sampai keempat layanan `Up (healthy)` — urutan ollama → ai-service → gateway → frontend diatur healthcheck.
3. Verifikasi: `curl -s http://localhost:8080/health` dan pastikan frontend merespons di http://localhost:5173.
4. Sajikan tabel ringkasan: layanan | status | port | catatan. Bila ada yang gagal, telusuri sesuai skill dev-workflow (mulai dari layanan paling hulu yang unhealthy).
