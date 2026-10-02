# Katalog Issue

Satu entri = satu gejala yang bisa dikenali, satu akar masalah, satu solusi yang sudah terbukti.
Baris baru ditambahkan di atas. Entri yang belum diverifikasi ditandai `[belum diverifikasi]`.

---

## ENV-001 — `localhost:5173` dan `localhost:8080` tidak bisa diakses

**Gejala.** `curl http://localhost:5173` dan `curl http://localhost:8080/health` sama-sama
balas `000`. `docker compose ps` menunjukkan `frontend 5173/tcp` tanpa bagian publish ke host.

**Akar masalah.** Stack sedang dijalankan dengan `docker-compose.prod.yml` ikut sebagai override.
Berkas itu memakai `ports: !reset []` untuk `frontend` dan `gateway`, jadi keduanya tidak
dipublish ke host sama sekali. Traefik juga tidak publish port. Di mode prod, lalu lintas hanya
lewat `https://humi.karlearn.site` dengan Cloudflare di depannya.

**Cara memastikan.** `docker inspect humi-frontend-1 --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'`.
Kalau baris terakhirnya `docker-compose.prod.yml`, inilah penyebabnya.

**Solusi.** Untuk developmental lokal, jalankan tanpa override prod:

```bash
make down-prod && make up
```

Kalau memang butuh akses dari luar jaringan lokal, pakai `https://humi.karlearn.site` dan jangan
mengecek lewat `localhost`.

**Dampak.** Memblokir seluruh verifikasi browser, screenshot, dan pengujian manual. Sudah memakan
waktu sebelum ketahuan.

---

## ENV-002 — MCP tool `playwright` gagal jalan

**Gejala.** Pemanggilan tool browser gagal karena executable Chrome tidak ada.

**Akar masalah.** Channel `chrome` dikonfigurasi menunjuk `/opt/google/chrome/chrome`, dan path itu
tidak ada di mesin ini.

**Solusi.** Pakai `playwright-core` langsung dengan binary Chromium dari cache Playwright:

- binary: `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`
- library: `~/.npm/_npx/*/node_modules/playwright-core/index.js` (CommonJS, pakai default import)
- argumen wajib: `--no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader`

---

## ENV-003 — Vite di container gagal resolve import padahal host punya paketnya

**Gejala.** Halaman balas HTTP 500 dengan pesan `Failed to resolve import "@pixi/app"`, padahal
`frontend/node_modules/@pixi/app` ada di host.

**Akar masalah.** Named volume `frontend_node_modules` di-mount ke `/app/node_modules`, sehingga
menutup hasil `npm install` yang sudah dijalankan di tahap build Dockerfile. Volume punya
konten sendiri yang bisa tertinggal jauh di belakang `package.json`.

**Solusi.** Setelah dependency frontend berubah, selalu sinkronkan volume:

```bash
docker compose exec frontend npm ci
```

Periksa hasilnya dengan `docker compose exec frontend sh -c 'ls node_modules/@pixi'`.

---

## ENV-004 — `uipro init` tidak punya mode dry-run

**Gejala.** `npx ui-ux-pro-max-cli init --ai opencode --dry-run` gagal dengan
`error: unknown option '--dry-run'`.

**Akar masalah.** Opsi yang tersedia cuma `-a/--ai`, `-f/--force`, `-o/--offline`, `-g/--global`,
dan `-t/--token`.

**Solusi.** Jalankan di direktori scratch kalau ingin melihat hasilnya tanpa menyentuh repo, lalu
salin seperlunya:

```bash
mkdir -p /tmp/opencode/uipro-probe && cd /tmp/opencode/uipro-probe
npx --yes ui-ux-pro-max-cli@latest init --ai opencode
```

---

## ENV-005 — `uipro` menulis ke path yang beda dengan konvensi repo

**Gejala.** Setelah `uipro init`, ada folder `.opencode/skills/` (jamak) padahal repo ini memakai
`.opencode/skill/` (tunggal). Di dalam dokumen skill juga ada rujukan `.claude/skills/...` yang
menunjuk folder yang tidak pernah ada di repo ini.

**Akar masalah.** `assets/templates/platforms/opencode.json` di paket upstream meng-hardcode
`"skillPath": "skills/ui-ux-pro-max"`, dan beberapa sub-skill berasal dari paket Claude Code yang
mengarang path `.claude/skills/`.

**Solusi.** Setelah install, rapikan tiga hal: pindahkan path, perbaiki rujukan, buang yang tidak relevan.

```bash
cd .opencode && for d in skills/*/; do mv "$d" "skill/$(basename "$d")"; done && rmdir skills
rg -l '\.claude/skills' skill/ | xargs sed -i \
  -e 's|~/\.claude/skills/|.opencode/skill/|g' -e 's|\.claude/skills/|.opencode/skill/|g'
```

OpenCode membaca kedua konvensi, tapi konvensi repo harus dijaga agar tidak ada dua folder skill
dengan isi berbeda.

**Yang dibuang dan alasannya.** Installer ikut membawa `banner-design`, `slides`, `brand`, dan
`design`. Keempatnya dibuang karena isinya soal artefak pemasaran, bukan antarmuka obrolan:
logo dan corporate identity program, brand guideline, slide presentasi, dan banner sosial. Tiga di
antaranya juga menarik ke API Gemini berbayar yang tidak dipakai Humi. Yang dipertahankan hanya
`ui-ux-pro-max`, `design-system`, dan `ui-styling`.

Pemeriksaan sebelum membuang sudah dilakukan: ketiga skill yang dipertahankan tidak punya rujukan
path ke keempat skill yang dibuang, dan `design-system` sudah self-contained karena script dan
data slide-nya sendiri ada di `design-system/scripts` dan `design-system/data`, bukan di folder
`slides`.

```bash
rg -n 'opencode/skill/(banner-design|slides|brand|design)/' design-system ui-styling ui-ux-pro-max
```

**Penting.** `uipro update` akan memasang ulang keempatnya. Ulangi langkah prune setiap kali
update, lalu cek lagi tidak ada rujukan silang yang putus.

---

## LIVE2D-001 — Model load tapi tidak pernah menggambar

**Gejala.** Tidak ada error di console, request aset model balas 200, tapi kanvas kosong.

**Akar masalah.** `pixi-live2d-display` mengikat model ke `Ticker.shared` lewat `autoUpdate`, dan
`Ticker.shared` tidak pernah di-start di aplikasi ini.

**Solusi.** Matikan auto update dan pompa manual dari ticker aplikasi:

```ts
autoUpdate: false
app.ticker.add((ticker) => model.update(ticker.deltaMS))
```

---

## LIVE2D-002 — Model jadi 99.97 persen di luar kanvas

**Gejala.** Model Hiyori (2976x4175) hampir tidak terlihat di panel avatar 622x126.

**Solusi.** Tiga bagian, semuanya sudah dipakai di `Live2DStage.tsx`:

1. `resizeTo: host` pada `Application` supaya kanvas mengikuti elemen pembungkus.
2. Tangkap ukuran authored satu kali saat `model.scale` masih `1`.
3. Fit-and-center lewat `frontend/src/lib/fitModel.ts`.

**Gotcha.** `model.width` yang dilaporkan model hidup **sudah memasukkan `model.scale`**. Membacanya
di dalam callback resize akan mengalikan scale berulang setiap kali panel berubah ukuran. Itu
sebabnya `fitModel.ts` punya unit test idempotensi.

---

## LIVE2D-003 — Import statis Pixi menjatuhkan seluruh aplikasi

**Gejala.** Aplikasi gagal total, termasuk saat `VITE_AVATAR_FORMAT` masih `emoji`, begitu
`pixi-live2d-display` di-import di top level modul.

**Akar masalah.** `dist/cubism4.es.js:5188` melempar `Error` di top level modul ketika global
Cubism Core tidak ada. `avatarFormat.ts` sengaja tidak menyentuh `import.meta.env` supaya bisa
diuji tanpa DOM, jadi jalur emoji tidak pernah memuat Core.

**Solusi.** Semua import Pixi harus di dalam fungsi `boot()`, yang hanya dipanggil saat format
memang `live2d`. Akibatnya renderer jadi chunk terpisah yang hanya diunduh saat dibutuhkan.

---

## LIVE2D-004 — `<script>` Core dianggap sukses padahal berkasnya tidak ada

**Gejala.** Loader melaporkan Core sudah termuat, tapi model gagal render.

**Akar masalah.** Dev server Vite menjawab HTTP 200 dengan `text/html` untuk berkas yang tidak
ada, sehingga respons HTML dieksekusi tanpa error dan event `load` tetap menyala. Event `error`
juga tidak pernah terpakai.

**Solusi.** `onload` hanya dianggap sukses kalau `window.Live2DCubismCore` benar-benar muncul.
Logika ini sudah ada di `frontend/src/lib/cubismCore.ts` beserta unit test-nya.

---

## LIVE2D-005 — Dugaan salah soal kompatibilitas Core 5 dengan model Cubism 4

**Gejala.** Cubism Core yang diunduh dari SDK resmi melaporkan versi 5.1.0, sedangkan sample model
Hiyori dibuat dengan Cubism 4. Ada kecurigaan bahwa keduanya tidak bisa dipakai bersama.

**Akar masalah.** Dugaan ini salah karena kita salah membaca bentuk API. `pixi-live2d-display@0.4.0`
memanggil API bentuk namespace, yaitu `Live2DCubismCore.Version.csmGetVersion()`, bukan bentuk
`csm*` datar. Karena itu Core 5.1.0 tetap kompatibel.

**Solusi.** Pakai Core dari domain resmi first-party:
`https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js` (sekitar 207 KB).

**Catatan tambahan.** Paket `live2dcubismcore` di npm ditolak dengan sengaja. Tidak ada sumber
resmi yang menghosting Core di luar SDK ber-EULA, dan menarik kode proprietary dari pihak ketiga
yang tidak terverifikasi tidak sebanding dengan risikonya.

---

## LIVE2D-006 — Remount kedua di StrictMode merusak texture

**Gejala.** Setelah mount ulang, model hilang atau jadi rusak.

**Akar masalah.** `app.destroy(true)` memakai default `texture: true` yang juga menghapus cache
texture Pixi. Cache itu masih dibutuhkan oleh instance berikutnya.

**Solusi.**

```ts
app.destroy(true, { texture: false, baseTexture: false })
```

---

## VERIF-001 — Cara memverifikasi frame Live2D

**Gejala.** Dua teknik baca-piksel langsung sama-sama melaporkan nol piksel opaque, padahal frame
sudah benar tergambar. Ini sempat membuat model yang sebenarnya render terlihat seperti gagal.

**Teknik yang salah.** `canvas.toDataURL()` lalu di-`drawImage`, dan `gl.readPixels`.

**Teknik yang benar.** Decode PNG hasil `canvas.toDataURL()`, lalu baca kanal alpha. Dari situ
siluet bisa dicek dengan memberi karakter ASCII per tingkat alpha.

**Kenapa screenshot Playwright tidak bisa dipakai untuk ini.** Screenshot mengompositkan background
elemen ancestor, jadi `omitBackground` tidak menolong untuk mengukur alpha.

---

## DOC-001 — Karakter asing menyisip ke dokumen Indonesia

**Gejala.** Setelah mengedit `.plan/live2d-avatar.md`, muncul karakter CJK dan karakter rusak di
tengah kalimat Indonesia yang tadinya bersih. Dua jenis yang pernah ditemukan: karakter CJK utuh,
dan kata Indonesia yang terpotong di tengah seperti `iersedia` (dari `tersedia`) atau
`Gejalanyaruh` (dari `Gejalanya sudah`).

**Solusi.** Jalankan pemeriksaan karakter di luar rentang Latin setiap selesai mengedit dokumen:

```bash
python3 - <<'PY'
import sys, pathlib
for p in sys.argv[1:] or [".plan/live2d-avatar.md"]:
    t = pathlib.Path(p).read_text()
    bad = [(i + 1, repr(c)) for i, c in enumerate(t) if ord(c) > 0x2FFF]
    print(p, "bersih" if not bad else bad)
PY
```

---

## REPO-001 — `.opencode/.gitignore` tidak pernah ter-track

**Gejala.** Aturan ignore yang ditambahkan di dalam `.opencode/.gitignore` kelihatan benar secara
lokal tapi tidak berlaku untuk siapa pun yang clone repo.

**Akar masalah.** Berkas itu mengabaikan dirinya sendiri, jadi tidak pernah masuk ke index git.

**Solusi.** Semua aturan gitignore baru ditulis di `.gitignore` di root repo.

---

## REPO-002 — `.plan/stored-plan.md` hampir ikut ter-commit karena negasi gitignore

**Gejala.** `git status` menampilkan `?? .plan/stored-plan.md` padahal seharusnya sudah masuk daftar
abaikan. Berkas itu milik user, tidak boleh disentuh dan tidak boleh masuk commit.

**Akar masalah.** Dua hal bertemu.

1. Yang menahan berkas itu hanya `.git/info/exclude` baris `stored-plan.md`, sifatnya lokal dan
   tidak ikut ter-push.
2. `.gitignore` di root repo memuat negasi `!.plan`. Negasi di `.gitignore` punya prioritas lebih
   tinggi daripada pola ignore di `.git/info/exclude`, jadi negasi itu membatalkan pelindungan
   lokal tersebut.

Pemicunya adalah perubahan `!.plan` menjadi `!.plan/*` di `.gitignore`. Bentuk yang lebih spesifik
justru berlawanan dengan maksudnya: dengan `!.plan`, berkas masih tertutup `.git/info/exclude`,
sedangkan dengan `!.plan/*` isi folder `.plan` secara eksplisit dimasukkan kembali.

**Bukti.** Dengan `.gitignore` versi HEAD, `git check-ignore -v .plan/stored-plan.md` melaporkan
`.git/info/exclude:7:stored-plan.md`. Setelah diubah jadi `!.plan/*`, laporan yang sama berubah
menjadi `.gitignore:14:!.plan/*` dan berkas muncul lagi di `git status`.

**Solusi.** Kembalikan baris itu ke `!.plan`. Jangan pernah mengubahnya menjadi `!.plan/*`,
dan jangan menambahkan negasi lain di bawah `.plan/`.

**Sisa risiko.** Pelindungan ini lokal. Clone baru tidak punya entri di `.git/info/exclude`, jadi
`.plan/stored-plan.md` akan terbaca sebagai berkas baru. Karena itu `git add -A` tetap perlu
dicek dengan `git status` sebelum commit.

---

## ENV-006 — `make down-prod` mematikan seluruh stack, bukan hanya mode prod

**Gejala.** Setelah `make down-prod`, `localhost:5173` dan `localhost:8080` balas `000` padahal
override prod sudah tidak aktif. Upaya mengikuti langkah ENV-001 dengan `make up` juga tidak
mengembalikan apa-apa kalau tidak dijalankan sampai habis.

**Akar masalah.** `down` dan `down-prod` di `Makefile` memakai project compose yang sama, yaitu
`name: humi` di `docker-compose.yml`. `down-prod` hanya menambah `-f docker-compose.prod.yml` ke
baris yang sama, dan `docker compose down` menghentikan seluruh service di project itu,
termasuk yang tidak ada di override prod.

**Solusi.** Perlakukan `down-prod` sebagai `down`, bukan sebagai "kembali ke mode dev". Untuk
balik ke verifikasi lokal, jalankan `make up` setelahnya dan tunggu `frontend` balas 200 sebelum
screenshot.

---

## DOC-002 — Kata Indonesia rusak dan karakter CJK muncul lagi di dokumen panjang

**Gejala.** Ini berulang tiga kali dalam satu sesi, di tiga berkas berbeda. Yang muncul bukan
hanya karakter CJK utuh seperti pada DOC-001, tapi juga kata bercampur huruf asing di tengah,
misalnya `MEXCOS`, `spasibased`, `salingFERENCE`, `WajibILA`, dan `heightNYA`. Kata yang
ditulis benar seperti `Ringkasnya:` pun bisa kehilangan huruf dan menyisipkan dua karakter
CJK, jadi sebutan di contoh ini sengaja ditulis ulang tanpa huruf CJK-nya sendiri supaya
pemeriksa karakter di bawah tidak terus menemukan dirinya sendiri.

**Akar masalah.** Menyunting kalimat panjang secara berulang sambil menyalin dari konteks
sebelumnya memasukkan fragmen dari sumber lain. Gejalanya muncul justru pada kalimat yang sedang
dirapikan, misalnya `{-nya}` dan `yaitu_chain_`.

**Solusi yang terbukti andal.** Scan per baris sambil menyimpan nomor baris, lalu perbaiki pakai
nomor baris, bukan mencocokkan string panjang:

```python
in_fence = False
for i, line in enumerate(t.split("\n"), 1):
    if line.strip().startswith("```"):
        in_fence = not in_fence
        continue
    if in_fence:
        continue
    if any(ord(c) > 0x2FFF for c in line):
        report.append(i)
```

Blok kode dilewati karena CSS dan token memang memakai karakter di luar rentang Latin.

Emoji **boleh** muncul kalau sedang mengutip bukti kondisi saat ini, misalnya ikon `🎙` yang
dipakai `frontend/src/App.tsx` sekarang dan akan diganti inline SVG. Kalau onboard tidak sedang
membaca ulang kode yang relevan, perlakukan emoji sebagai temuan dan perbaiki.

**Tiga jebakan alat yang memakan waktu lebih lama daripada masalahnya.**

1. `rg -n '"\$value"'` tidak pernah cocok. Di regex, `$` adalah anchor akhir baris, bukan
   karakter dolar. Pakai `rg -Fn` untuk pencarian literal.
2. `python3` dengan `'"\$value":'` juga tidak cocok. Di Python, `"\$"` adalah dua karakter yaitu
   `\` dan `$`, bukan satu karakter dolar.
3. Menulis `\uXXXX` langsung di dalam heredoc shell sering salah ketik dan hasilnya nol match.
   Batas rentang CJK lebih aman ditulis sebagai `0x2FFF` di Python.

---

## TOOL-001 — Biome menolak komentar di `biome.json`, dan formatter merusak berkas hasil generate

**Gejala.** Dua masalah muncul berurutan saat menambahkan blok `@theme` Tailwind v4.

1. `lint/complexity/noImportantStyles` muncul di blok `prefers-reduced-motion`. Mematikannya lewat
   `overrides` gagal karena `biome.json` diparse sebagai JSON strict.
2. Setelah `overrides` berhasil, test kontras gagal karena `frontend/src/styles/tokens.css` tidak
   lagi sama dengan hasil generator.

**Akar masalah.**

1. Komentar hanya sah di `biome.jsonc`. Saat `biome.json` gagal di-deserialize, Biome jatuh ke
   konfigurasi default dan ikut memindai 68 file, sehingga memunculkan 17973 error palsu.
2. `biome format --write` menormalkan huruf besar hex dari `#0B0912` menjadi `#0b0912`, sedangkan
   test membandingkan nilai token apa adanya. Berkas hasil generate seharusnya tidak pernah
   disentuh formatter.

**Solusi.** Rename `biome.json` menjadi `biome.jsonc` supaya bisa diberi komentar, aktifkan parser
Tailwind, lalu kecualikan hanya berkas hasil generate:

```jsonc
"files": {
  "includes": ["src/**/*", "!src/styles/tokens.css", "biome.jsonc"]
},
"css": { "parser": { "tailwindDirectives": true } }
```

Kecualikan berkas yang generated saja. CSS tangan di `src/styles/` tetap harus diformat, jadi
jangan mengecualikan seluruh folder.

---

## TOOL-002 — `validate-tokens.cjs` dari skill `design-system` hanya menangkap hex mentah

**Gejala.** Script itu melaporkan 14 pelanggaran, semuanya di `frontend/src/lib/tokens.test.ts`,
dan nol di `App.tsx` padahal `App.tsx` masih memakai `indigo-600` dan `neutral-900` yang bukan
token Humi.

**Akar masalah.** Script hanya mencari literal `#RRGGBB` di dalam source. Komponen Humi menulis
kelas utilitas Tailwind, dan nama kelas seperti `indigo-600` bukan hex sehingga lolos tanpa
periksa. Script juga selalu keluar dengan status 0, jadi tidak bisa dipakai sebagai gerbang.

**Solusi.** Jangan jadikan ini gerbang CI, dan catat keterbatasannya di dokumen design system
supaya tidak ada yang mengira cakupan ladanya lebih lebar dari kenyataan. Penegakan token yang
benar datang dari `@theme inline` di `frontend/src/index.css`, ditambah
`frontend/src/lib/tokens.test.ts` yang menguji kontras dan kesegaran CSS hasil generate.
