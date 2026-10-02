---
name: dev-memory
description: Memory kerja proyek Humi — katalog issue, blocker, dan jebakan lingkungan yang sudah pernah ditemukan beserta solusinya, supaya sesi baru atau model lain tidak mengulang kesalahan yang sama. Baca WAJIB sebelum debug, sebelum menyimpulkan penyebab dari asumsi, dan sebelum menjalankan browser/Playwright, docker compose, atau tooling UI. Gunakan saat error ini terasa aneh, saat gejalanya belum ada di dokumen, atau saat mau menyatakan sesuatu mustahil.
---

# Dev Memory

Memory ini tidak menyimpan keputusan arsitektur (itu milik `docs/architecture.md`) dan tidak
menyimpan rencana kerja (itu milik `.plan/`). Yang disimpan di sini satu kelas informasi saja:
**apa yang sudah gagal, bagaimana gejalanya, dan apa solusi yang sudah terbukti.**

Katalog lengkap ada di `issues.md`. Baca file itu kalau gejalanya tidak ada di bawah.

## Cara pakai

| Situasi | Tindakan |
|---|---|
| Debug error yang belum pernah muncul | Baca `issues.md` dulu, cari gejalanya |
| Mau menyimpulkan "pasti penyebabnya X" | Cek dulu; di sini ada pola yang sudah pernah diverifikasi |
| Sebelum menjalankan browser, Playwright, atau screenshot | Lihat "Blocker lingkungan aktif" di bawah |
| Selesai menemukan jebakan baru | Tambahkan ke `issues.md` dengan format yang sama |

Aturan isi: satu entri = satu gejala yang bisa dikenali, satu akar masalah, satu solusi yang
sudah terbukti. Jangan masukkan keputusan desain, jangan masukkan yang belum diverifikasi, dan
tandai entri yang masih teori dengan `[belum diverifikasi]`.

## Blocker lingkungan aktif

Status per 2026-10-02. Semua di sini sudah dicek langsung, bukan asumsi.

1. **MCP tool `playwright` rusak.** Channel `chrome` mengarah ke `/opt/google/chrome/chrome`
   yang tidak ada. Binary yang bisa dipakai ada di
   `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`.
   Workaround: pakai `playwright-core` dari `~/.npm/_npx/*/node_modules/playwright-core/index.js`
   (CommonJS, default import) dengan argumen
   `--no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader`.

2. **Volume `frontend_node_modules` menutup `/app/node_modules`, jadi `npm install` di
   Dockerfile tidak berarti apa-apa.** Setelah dependency frontend berubah, selalu jalankan
   `docker compose exec frontend npm ci`. Gejala klasik: host punya paketnya, tapi Vite di
   container balas `Failed to resolve import "@pixi/app"` dengan HTTP 500. Sudah terverifikasi
   per 2026-10-02 bahwa container punya `@pixi/*` dan `pixi-live2d-display`.

3. **`.opencode/.gitignore` mengabaikan dirinya sendiri, jadi tidak pernah ter-track.**
   Setiap aturan gitignore baru harus masuk ke `.gitignore` di root repo.

4. **`uipro init` tidak punya flag `--dry-run`.** Opsi yang ada hanya
   `-a/--ai`, `-f/--force`, `-o/--offline`, `-g/--global`, `-t/--token`.
   Workaround: jalankan di direktori scratch, lalu salin yang diperlukan.

5. **Tailwind v4 tanpa `tailwind.config.js`.** Token lewat blok `@theme inline` di
   `frontend/src/index.css`, bukan lewat file konfigurasi. `inline` wajib, kalau tidak modifier
   opasitas seperti `bg-panel/60` berhenti membaca lewat lapisan token.

6. **Berkas hasil generate harus dikecualikan dari formatter Biome.** `frontend/biome.jsonc` memuat
   `"!src/styles/tokens.css"` di `files.includes`. Tanpa itu, `biome format --write` menormalkan
   huruf besar hex dan test kesegaran CSS langsung gagal. Konfiguranya harus bernama
   `biome.jsonc`, bukan `biome.json`, karena `overrides` di situ perlu komentar penjelas.

7. **`uipro` menulis ke `.opencode/skills/` (jamak) dan mereujuk `.claude/skills/` di dalam
   dokumen.** Repo ini memakai `.opencode/skill/` (tunggal). Setelah `uipro init`, pindahkan foldernya lalu
   ganti semua rujukan `.opencode/skills/` dan `.claude/skills/` di dalam dokumen skill.
   OpenCode membaca kedua konvensi, tapi konvensi repo harus dijaga agar tidak ada dua folder
   skill dengan isi berbeda.

8. **`uipro` juga membawa empat skill yang tidak dipakai Humi, yaitu `banner-design`, `slides`,
   `brand`, dan `design`.** Semuanya soal logo, brand guideline, presentasi, dan banner sosial,
   dan sebagian menarik ke API Gemini berbayar. Buang setiap kali install atau update. Skill yang
   dipakai hanya `ui-ux-pro-max`, `design-system`, dan `ui-styling`. Perintah prune-nya ada di
   `issues.md` bagian ENV-005.

9. **`make down-prod` sama saja dengan `make down`.** Keduanya memakai project compose yang sama
   (`name: humi`), jadi `down-prod` mematikan seluruh stack, bukan cuma mode prod. Untuk balik
   ke verifikasi lokal harus `make up` lagi. Detailnya di `issues.md` bagian ENV-006.

## Gerbang design token

Sumber kebenaran token adalah `design-system/humi/tokens.json`. Setelah mengubahnya:

```bash
npm --prefix frontend run tokens   # regenerate frontend/src/styles/tokens.css
npm --prefix frontend test         # kontras + kesegaran CSS hasil generate
```

`validate-tokens.cjs` dari skill `design-system` **tidak dipakai sebagai gerbang**. Script itu
hanya menangkap hex mentah, sementara komponen Humi menulis kelas utilitas Tailwind, dan status
keluarannya selalu 0. Alasannya ada di `issues.md` bagian TOOL-002.

## Jebakan Live2D yang sudah diperbaiki, jangan diulang

Ringkasan. Penjelasan lengkap ada di `issues.md`.

- `pixi-live2d-display@0.4.0` memanggil API bentuk namespace
  (`Live2DCubismCore.Version.csmGetVersion`), bukan bentuk `csm*` datar. Karena itu Cubism Core
  5.1.0 dari SDK resmi tetap kompatibel dengan sample model Cubism 4. Dugaan awal bahwa keduanya
  bentrok versi ternyata salah, karena kita salah membaca bentuk API-nya.
- `dist/cubism4.es.js:5188` melempar error di top level saat global Core hilang, jadi import Pixi
  hanya boleh di dalam `boot()`, tidak boleh statis di modul.
- `autoUpdate: false` plus `model.update(pixi.ticker.deltaMS)` manual. Bawaan library mengikat
  model ke `Ticker.shared` yang tidak pernah di-start, sehingga model berhasil load tapi tidak
  pernah menggambar.
- `model.width` yang dilaporkan model hidup **sudah memasukkan `model.scale`**. Ukuran authored
  harus ditangkap satu kali saat scale masih 1, kalau tidak scale akan terhitung berulang.
- `app.destroy(true, { texture: false, baseTexture: false })`. Default `texture: true` menghapus
  cache texture Pixi dan merusak remount kedua di StrictMode.
- Dev server Vite menjawab HTTP 200 `text/html` untuk berkas yang hilang, jadi event `load` pada
  `<script>` tetap menyala. Keberhasilan muat Core wajib dicek lewat keberadaan
  `window.Live2DCubismCore`, bukan lewat event.

## Cara memverifikasi frame Live2D

Dua teknik baca-piksel langsung sama-sama melaporkan nol piksel opaque padahal frame sudah benar
tergambar: `canvas.toDataURL()` yang di-`drawImage`, dan `gl.readPixels`. Cara yang benar:
**decode PNG hasil `canvas.toDataURL()`, lalu baca kanal alpha.** Screenshot Playwright juga tidak
bisa dipakai untuk mengukur alpha karena mengompositkan background elemen ancestor, jadi
`omitBackground` tidak menolong.

## Fakta repo yang sering disalahpahami

- `frontend/package.json` masih punya empat dependency VRM mati, yaitu `three`,
  `@react-three/fiber`, `@react-three/drei`, dan `@pixiv/three-vrm`, yang nol import di `src/`.
- `.opencode/skill/avatar-frontend/SKILL.md` masih basi. Isinya menyebut `ChatPanel.tsx`,
  `MicButton.tsx`, `useLipsync.ts`, dan `store/chat.ts` yang tidak pernah ada di repo.
- Hiyori hanya punya motion group `Idle` dan `TapBody`. Tidak ada `Happy`, `Sad`, atau `Angry`,
  jadi mapping emotion sebagian besar jatuh ke parameter fallback.
- `.plan/stored-plan.md` milik user dan tidak boleh disentuh atau di-commit. Pelindungannya hanya
  `.git/info/exclude` yang lokal. Karena `.gitignore` root memuat negasi `!.plan` yang berprioritas
  lebih tinggi, baris itu harus tetap `!.plan`. Mengubahnya menjadi `!.plan/*` membuat berkas
  user muncul lagi di `git status` dan berisiko ikut ter-commit.

## Jebakan saat menulis dokumen Indonesia

Menulis teks ke `.plan/live2d-avatar.md` pernah menyisipkan karakter CJK dan karakter rusak tanpa
sengaja, di tengah kalimat Indonesia yang tadinya bersih. Setelah setiap edit dokumen Indonesia,
jalankan pemeriksaan karakter di luar rentang Latin.

```bash
python3 - <<'PY'
import sys, pathlib
for p in sys.argv[1:] or [".plan/live2d-avatar.md"]:
    t = pathlib.Path(p).read_text()
    bad = [(i + 1, repr(c)) for i, c in enumerate(t) if ord(c) > 0x2FFF]
    print(p, "bersih" if not bad else bad)
PY
```
