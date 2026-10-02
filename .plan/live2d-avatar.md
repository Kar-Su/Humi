# Plan: Integrasi Avatar Live2D (Fase A Runtime) dengan Sample Model

> Status: **Draft, keputusan belum terkunci**. Tidak ada kode ditulis sampai `yes/proceed`.
>_asumsi default_: Live2D jadi avatar utama, sample model dulu, model custom menyusul.
> Blueprint: pola AIRI (`packages/stage-ui-live2d`, `packages/stage-ui`), bukan fork.

## Requirements Restatement

Ganti avatar Humi dari placeholder emoji ke render Live2D sungguhan, dengan lip-sync dari audio TTS Fish yang sudah jalan dan emotion 25 nilai yang sudah ada di protocol.

Kondisi repo saat ini (terverifikasi read-only):

| Item | Status | Referensi |
|---|---|---|
| `AvatarCanvas.tsx` | Placeholder emoji, `analyser` dibuang via `void _analyser` | `frontend/src/components/AvatarCanvas.tsx:38` |
| Dep VRM | Terpasang tapi nol import di `src/` | `frontend/package.json:13-20` |
| Dep Live2D | Belum ada | - |
| Protocol | Netral format, nol perubahan perlu | `frontend/src/lib/protocol.ts:4-30` |
| Emotion state | Sudah mengalir ke `AvatarCanvas` | `frontend/src/App.tsx:42,153,372` |
| AnalyserNode | Sudah di-plumb ke avatar, belum dibaca | `frontend/src/useAudioQueue.ts:17-21,38` |
| `frontend/public/` | Tidak ada | - |
| `.gitignore` | Cover `*.vrm`, `*.vrma`, belum `*.moc3`/`*.model3.json` | `.gitignore:13-14` |
| D2 | VRM diputuskan, Live2D ditolak, tanpa marker revisit | `docs/architecture.md:19` |

Blokir utama bukan kode runtime, tapi tidak adanya model Live2D. Live2D tidak bisa dikodekan: butuh ilustrasi berlapis PSD, lalu Cubism Editor, lalu export. Karena itu runtime dibangun lebih dulu memakai sample model resmi supaya tidak terblokir.

Dua pekerjaan terpisah, jangan dicampur:

| Bagian | Pemilik | Estimasi |
|---|---|---|
| A. Runtime integrasi | Developer (agent) | 3-4 hari |
| B. Model custom Humi | Artist / Cubism Editor / komisi | 1-6 minggu, HIGH |

## Impact Surface

```text
frontend/
  index.html                 +1 script Cubism core, sebelum module bundle
  package.json               + @pixi/* modular v6.5.10, pixi-live2d-display@0.4.0 (pin)
  vite.config.ts             opsional: alias @framework/*, gate devOnly
  public/assets/js/          live2dcubismcore.min.js (gitignored, unduh manual)
  public/live2d/humi/        sample model (gitignored)
  src/components/
    AvatarCanvas.tsx         jadi host, delegasi ke renderer
    Live2DStage.tsx          BARU, Pixi Application + model load
    useLipsync.ts            BARU, RMS dari AnalyserNode ke mouth value
    useEmotionMap.ts         BARU, 25 emotion ke motion group/parameter
  src/lib/avatarFormat.ts    BARU, 'live2d' | 'vrm' | 'emoji'
docs/architecture.md:19      D2 revisit + alasan
docs/roadmap.md:17           hapus tanda VRM placeholder sebagai DONE
.opencode/skill/avatar-frontend/SKILL.md  sync ke realita kode
.gitignore                   + *.moc3, *.model3.json, public/live2d
```

Tidak menyentuh: `gateway/`, `ai-service/`, `.opencode/skill/protocol-contract/SKILL.md`, tipe Go, model Pydantic. Protocol v1 tetap apa adanya karena `emotion` dan `analyser` keduanya format-agnostic.

## Implementation Phases

### Sesi A - Fondasi: keputusan D2, ignore rules, dependency [0.5 hari] : SELESAI

Hasil eksekusi:

- **Nomor keputusan jadi `D12`, bukan `D13` seperti draft plan.** Repo ini tidak punya `D12`, keputusan terakhir sebelum ini `D11`. Memakai `D13` menyisakan lubang penomoran yang terlihat seperti keputusan yang hilang.
- `docs/architecture.md:19` baris D2 diberi penanda `direvisit D12` tanpa menghapus jejak keputusan lama.
- `docs/architecture.md:29` baris baru `D12` "Avatar: Live2D Cubism via PixiJS (revisit D2, 2026-10-02)" dengan alasan: target produk waiku ilustrasi 2D, ekspresi 2D lebih hidup, render lebih ringan di laptop dev, protocol tidak berubah, Dep VRM dibiarkan terpasang.
- `docs/architecture.md:10` dirapikan: "ber-avatar 3D" jadi "ber-avatar Live2D" supaya tidak bertabrakan dengan D12.
- **Koreksi dependency terhadap draft plan: bukan `pixi.js` monolitik, tapi paket modular `@pixi/*`.** `pixi-live2d-display@0.4.0` (versi stabil terakhir) punya `peerDependencies` ke `@pixi/core|math|utils|sprite|display|loaders ^6`, bukan ke `pixi.js`. Versi `0.5.0-beta` memang memakai `pixi.js@^7` tapi statusnya beta dan AIRI tidak memakainya. `6.5.10` adalah rilis Pixi 6 terakhir, tidak deprecated, dan persis sama dengan yang di-pin AIRI.
- `frontend/package.json` 9 paket di-pin **tanpa caret** (deviasi dari konvensi repo yang pakai caret, disengaja karena mismatch peer dependency adalah penyebab kegagalan paling sering di integrasi ini): `@pixi/app`, `@pixi/core`, `@pixi/display`, `@pixi/extensions`, `@pixi/loaders`, `@pixi/math`, `@pixi/sprite`, `@pixi/ticker`, `@pixi/utils` semuanya `6.5.10`, plus `pixi-live2d-display@0.4.0`. `@pixi/interaction` sengaja tidak dipasang karena InteractionManager tidak dipakai.
- **Tidak perlu `patch-package`.** Patch AIRI pada `pixi-live2d-display` hanya menyentuh `ZipLoader` dan `FileLoader` (filter `items_pinned_to_model.json`, buang `encodeURI` pada `webkitRelativePath`). Kita load dari URL folder, bukan `.zip`, jadi patch tidak relevan.
- **Override `gh-pages` ke `6.3.0`.** `pixi-live2d-display@0.4.0` Membocorkan devDependency `gh-pages@^4` ke runtime `dependencies`. Versi `<5.0.0` kena CVE prototype pollution (GHSA-8mmm-9v2q-x3f9, critical). Sudah diverifikasi `dist/cubism4.es.js` dan `dist/index.es.js` **tidak pernah import** `gh-pages` (0 kemunculan) dan paket itu hanya punya `bin`, jadi tidak terjangkau lewat import graph kita. Tetap di-override supaya tidak ada kode rentan di `node_modules`. `npm audit` sekarang `0 vulnerabilities`. Jangan hapus `overrides` tanpa membaca baris ini.
- Verifikasi: `npm run lint` exit 0, `npx tsc --noEmit` bersih, `npm run build` sukses (36 modul, 206.61 kB), `git ls-files` tidak mengandung aset Live2D apa pun.
- Catatan: warning `res` unused di `vite.config.ts:11` milik `biome check` sudah ada sebelum Sesi A dan tidak disentuh di sini, file `vite.config.ts` tidak berubah.
- Catatan: `npm` memblokir postinstall `esbuild@0.28.2` (fitur `allowScripts` npm 12). Binari nevertheless ada di `node_modules/@esbuild/linux-x64/bin/esbuild` dan build produksi tetap sukses, jadi bukan blocker.
- Acceptance terpenuhi: `git ls-files | grep -E 'moc3|model3\.json|CubismSdk'` kosong.

### Sesi B - Runtime minimal: load model dan render [1-1.5 hari] : SELESAI

Pola dari AIRI `apps/stage-web/index.html:88` dan `packages/stage-ui-live2d/src/components/scenes/live2d/Canvas.vue`.

Hasil eksekusi:

- **Penyimpangan dari draft plan: Cubism Core dimuat dinamis, bukan tag `<script>` di `index.html`.** `dist/cubism4.es.js:5188` melakukan `throw` di **top level modul** kalau `window.Live2DCubismCore` tidak ada. Import statis berarti crash seluruh app, termasuk saat format masih `emoji` dan core memang tidak perlu. Loader di `frontend/src/lib/cubismCore.ts` awaited lebih dulu, baru `await import("pixi-live2d-display/cubism4")`, jadi kelas bug load-order hilang total.
- Handler `onload` di loader **hanya resolve kalau global benar-benar muncul**. Ini bukan paranoia: Vite dev server mengembalikan `index.html` (HTTP 200, `Content-Type: text/html`) untuk `/assets/js/live2dcubismcore.min.js` yang tidak ada, dan `<script>` atas respons HTML itu **tidak** memicu event `error`, hanya `load`. Cek global adalah satu-satunya cara membedakan core yang termuat dari halaman fallback.
- Semua import Pixi (`@pixi/app`, `@pixi/core`, `@pixi/extensions`, `@pixi/ticker`) dipindah ke dalam `boot()` sebagai dynamic import, bukan di module scope. Konsekuensinya bundle utama tetap `211.04 kB` (dari `206.61 kB` di Sesi A, +4.4 kB) sementara ~376 kB renderer hanya diunduh saat `VITE_AVATAR_FORMAT=live2d`. Vite memotong jadi 6 chunk terpisah.
- **`Live2DModel.from` tidak dipakai** karena ada di runtime `dist` tapi **tidak ada** di `types/index.d.ts` (hanya `fromSync` yang dideklarasikan), jadi `tsc` gagal. Dipakai `Live2DFactory.setupLive2DModel` yang tipe-nya lengkap dan resolve hanya setelah texture + model termuat, sehingga model aman masuk stage.
- `setupLive2DModel` await event `ready` yang **tidak pernah fire saat gagal load**, jadi tanpa penanganan akan hang selamanya. Ditambah race timeout 20 detik plus penangkapan error, dan timer di-`clear` di `finally` serta saat unmount supaya tidak menggantung 20 detik setelah mount sukses.
- **Jebakan StrictMode:** `app.destroy(true, { texture: false, baseTexture: false })`. Default `DestroyOptions` adalah `texture: true`, yang menghapus texture dari cache Pixi. Di StrictMode React mount-remount, mount kedua akan mendapat texture yang sudah di-destroy. Cache Pixi dibiarkan utuh; sisi Cubism tetap dilepas lewat `children: true`.
- `autoInteract: false` dan **tanpa** `InteractionManager`, sesuai rencana Sesi D (eye tracking digerakkan manual).
- `frontend/src/lib/avatarFormat.ts` + `cubismCore.ts` sengaja **tidak menyentuh `import.meta.env`**, keduanya menerima argumen biasa supaya bisa diuji dengan `node:test` tanpa DOM. Env dibaca di `AvatarCanvas.tsx`.
- **`frontend/src/vite-env.d.ts` baru.** Belum ada di repo, jadi `import.meta.env` gagal `tsc` (`TS2339: Property 'env' does not exist on type 'ImportMeta'`). File itu juga yang mendeklarasikan `VITE_AVATAR_FORMAT` dan `VITE_LIVE2D_MODEL_URL`.
- **Bug UX yang ketahuan saat review:** `handleFailure` semula membuang argumen pesan, jadi `Live2DStage` langsung unmount dan detail "file mana yang kurang" tidak pernah terbaca user. Diperbaiki: `AvatarCanvas` menyimpan pesan itu dan menampilkannya di fallback emoji.
- `.gitignore` diubah dari `frontend/public/live2d/` jadi `frontend/public/live2d/*` + negasi `!frontend/public/live2d/README.md`, karena rules yang pakai nama folder utuh ikut menelan README di dalamnya.
- `frontend/public/live2d/README.md` (tracked) berisi langkah unduh Core + model dan aturan lisensinya. Ada script `npm test` baru di `package.json` karena sebelumnya tidak ada cara menjalankan test frontend.
- **Model sample: Hiyori dari `Live2D/CubismWebSamples` tag `4-r.7`, bukan mirror `dist.ayaka.moe`.** Mirror memblokir dengan HTTP 403. Tag `4-r.7` dipilih karena `pixi-live2d-display@0.4.0` menargetkan Cubism 4, sedangkan tag `5-r.*` memuat model Cubism 5. 18 berkas, 4.8 MB, dua tekstur 2048x2048.
- **Cubism Core tidak diunduh otomatis.** `Core/RedistributableFiles.txt` mengonfirmasi `live2dcubismcore.min.js` memang boleh disalin ulang, tapi hanya lewat SDK zip yang gerbang EULA-nya dan tidak ada di dalam repo. Ada `live2dcubismcore@1.0.2` di npm tanpa deskripsi dan tanpa kejelasan asal-usul; **sengaja tidak dipakai** karena itu memasukkan kode proprietary dari pihak ketiga yang tidak terverifikasi. Intinya Cubism Core sekarang jadi langkah manual yang dijelaskan di README.
- Verifikasi: `npm run lint` exit 0 (sisanya 1 warning `res` unused di `vite.config.ts:11` yang pre-existing), `npx tsc --noEmit` exit 0, `npm test` 22 pass / 0 fail, `npm run build` sukses, `npm ci` di container 0 vulnerabilities.
- **Masalah lingkungan yang ditemukan:** volume `frontend_node_modules` sudah 3 minggu dan **menutup** `npm ci` di Dockerfile, jadi container tidak punya paket Pixi dan Vite balas `Failed to resolve import "@pixi/app"` (HTTP 500). Volume disinkronkan dengan `docker compose exec frontend npm ci`. Kalau `import` baru tidak ketemu di browser padahal ada di host, periksa volume ini dulu.
- Verifikasi aset via HTTP: `/live2d/hiyori/Hiyori.model3.json` 200, `.moc3` 200, texture 200, motion 200. `Live2DStage.tsx` ter-transform HTTP 200 dengan kelima dynamic import ter-resolve ke chunk Vite terpisah.
- **Verifikasi browser (Chromium, headless) — jalur `emoji` default:** avatar emoji tampil, `WS: terhubung`, **nol request ke chunk Pixi sama sekali** (`canvas` count 0, nol request `/node_modules/.vite/deps/@pixi_*`). Jadi renderer benar-benar tidak terunduh untuk user yang tidak memakai Live2D.
- **Verifikasi browser — jalur `live2d` dengan Core absen:** 404 `/assets/js/live2dcubismcore.min.js`, loader menolak, avatar jatuh ke emoji dengan pesan yang menyebut path persis, tanpa blank screen, dan Pixi **tidak pernah** ter-import karena kegagalan terjadi sebelum dynamic import.
- Nol 404 yang tersisa di console sudah diverifikasi pre-existing, bukan dari Sesi B: `favicon.ico` (permintaan default browser, `index.html` memang tidak punya `<link rel=icon>`) dan beacon `cloudflareinsights.com` (snippet Cloudflare Web Analytics di `frontend/index.html:10`, terakhir diubah di commit `1699b43`).
- **`frontend/.env.local` sekarang ikut ter-ignore.** `.gitignore` lama hanya menutup `.env`, padahal README menyuruh developer menaruh `VITE_AVATAR_FORMAT` di `frontend/.env.local`, jadi file itu akan ikut ter-commit. Aturan diganti jadi `.env` + `.env.*` + negasi `!.env.example`.
- **Render model sungguhan sudah terverifikasi** (lihat blok "Perbaikan render" di bawah). Jalur `live2d` dengan Core terpasang menampilkan karakter Hiyori di panel, 17 request aset semuanya 200.

Acceptance: model render di browser, tidak ada error console, zero request 404 ke aset. → **TERPENUHI.**

#### Perbaikan render: tiga bug yang menutupi satu sama lain

Core diambil dari `https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js` (domain resmi first-party, HTTP 200, 207 KB, melaporkan Core 5.1.0). Setelah Core ada, model tetap tidak tampil. Tiga bug bertumpuk, dan dua yang pertama menutupi diagnosis yang ketiga:

1. **`autoUpdate` tidak pernah menggambar apa pun.** Bawaan `Live2DModel` mengikat model ke `Ticker.shared` (`dist/cubism4.es.js:4858`), dan tidak ada apa pun di aplikasi ini yang menyalakan ticker itu. GejalanyaUTHOR: model load, `CubismFramework.startUp()` selesai, `_render` dipanggil 566 kali, nol error, nol piksel. Diperbaiki dengan `autoUpdate: false` lalu `model.update(pixi.ticker.deltaMS)` di dalam loop render, jadi update dan render berbagi satu clock.
2. **Model 2976x4175 beranchor di origin, panel cuma 622x126.** Hampir 99.97% model digambar di luar kanvas. Terlihat sebagai stage kosong yang bersih, tanpa error. Diperbaiki dengan `resizeTo: host` plus skala fit dan center.
3. **`model.width` sudah memasukkan `model.scale`.** Versi pertama `fit()` membaca `model.width` di dalam callback, jadi tiap panggilan `ResizeObserver` mengalikan scale lagi. Avatar meledak jadi satu bidang datar memenuhi panel: PNG 106 KB dengan isi cream seragam dan rentang luminansi hanya 144 sampai 240. Diperbaiki dengan menangkap ukuran authored satu kali saat scale masih 1.

Kesalahan baca yang sudah aku buat sendiri: dua pixel-readback langsung (canvas `toDataURL` dan `gl.readPixels`) melaporkan nol piksel opaque padahal frame sudah benar-benar tergambar, sehingga diagnosis "belum render" terlalu cepat. Bukti yang benar datang dari men-decode PNG hasil `canvas.toDataURL()` lalu membaca kanal alpha-nya.

Akar masalah ketiganya sekarang punya unit test di `frontend/src/lib/fitModel.test.ts`, termasuk kasus "dipanggil sepuluh kali menghasilkan scale yang sama" supaya regresi yang sama tidak bisa kembali diam-diam.

Verifikasi akhir: `npm test` 31 pass / 0 fail, `npx tsc --noEmit` exit 0, `npm run lint` exit 0 (1 warning pre-existing), `npm run build` sukses dengan bundle utama 211.66 kB dan keenam chunk Pixi tetap lazy. Jalur `emoji` default masih nol request ke renderer.

### Sesi C - Lip-sync dari audio TTS [1 hari]

Pola dari AIRI `packages/model-driver-lipsync/src/live2d/index.ts` dan `packages/stage-ui/src/stores/audio.ts`.

- `frontend/src/useLipsync.ts` baru. rAF loop baca `analyser.getByteTimeDomainData` (fftSize 256 sudah di `useAudioQueue.ts:17-21` cukup), hitung RMS dari center 128, normalisasi.
- shaping: `value ** 1.2 * 1.2`, cap `0.7` sesuai AIRI supaya mulut tidak openedng fully (terlalu kaku).
- smoothing: lerp naik cepat (~50 ms), turun lebih lambat (~120 ms). Mulut yang mengikuti amplitude mentah akan jitter dan terlihat seperti noise.
- `nowSpeaking` ownership handoff, ini wajib benar:
  1. selama `nowSpeaking`, paksa `ParamMouthOpenY = value` setiap frame
  2. saat `nowSpeaking` false, release 200 ms smoothstep ke nilai motion
  3. tahan 500 ms dengan paksa `0` supaya idle motion tidak reopen mulut
  4. lepas ownership ke motion/expression plugin
  Tanpa langkah 3, mulut menggantung terbuka atau snap shut setelah AI selesai bicara.
- Naikkan `App.tsx:324` interrupt juga memicu release, bukan langsung `0`.
- `frontend/src/components/Live2DStage.tsx` pasang plugin lipsync di pipeline `motionManager.update` tahap `final`, dan set `live2DModel.internalModel.mouth` ownership eksplisit. Kalau plugin SDK masih aktif bersamaan, dua-duanya tulis parameter yang sama dan naiknyaMq interpolasiBehold sporadis.
- Kontrol harus bisa dimatikan: `VITE_AVATAR_LIPSYNC=off` untuk debug.

Acceptance: mulut bergerak sinkron dengan suara TTS, menutup bersih di akhir kalimat, tidak jitter.

### Sesi D - Emotion mapping 25 nilai [0.5-1 hari]

Pola dari AIRI `packages/stage-ui-live2d/src/constants/emotions.ts` dan `expression-controller.ts`.

- `frontend/src/useEmotionMap.ts` baru. Dua lapis mapping, karena 25 emotion tidak bisa semua jadi motion group:
  - **Subset motion group** (butuh file motion di model): petakan dulu `happy`, `sad`, `angry`, `surprised`, `calm`, `netral`. Airi punya 9 grup (`Happy`, `Sad`, `Angry`, `Think`, `Surprise`, `Awkward`, `Question`, `Curious`, `Idle`), sample model biasanya punya sebagian.
  - **Fallback parameter**: sisanya degrade ke `ParamMouthForm` (senyum vs cemberut), `ParamBrowL/RY`, `ParamEyeLOpen/ROpen`, `ParamCheek`. Contoh: `sarcastic` dan `embarrassed` jadi `ParamCheek` naik plus `ParamMouthForm` turun.
  - mapping lengkap 25 nilai wajib ada di kode dan terdokumentasi, dengan komentar value mana yang butuh motion file. Jangan silent-drop emotion yang tidak dipetakan, `App.tsx` sudah kirim 25 itu ke sini.
- Expression file `exp3.json`: baca `model3.json` `FileReferences.Expressions[]`, tiap `exp3.json` punya `Parameters: [{ Id, Value, Blend }]`. Support tiga blend mode: `Add` (`default + value`), `Multiply` (`current * value`), `Overwrite`.
- Kalau custom expression system aktif, set SDK `expressionManager` dan `eyeBlink` ke null supaya dua sistem tidak saling tulis tiap frame. Ini gotcha yang AIRI hadapi eksplisit.
- `src/lib/protocol.ts:4-30` nol perubahan. 25 emotion sudah ada dan sudah tervalidasi `isValidEmotion()` di `protocol.ts:61-63`.
- Terapkan per frame di tahap `final` motion pipeline, dan pakai `handled` flag supaya expression own parameter yang sama dengan motion group.

Acceptance: setiap emotion di `protocol.ts` punya entri mapping, tidak ada yang jatuh ke default diam tanpa jejak.

### Sesi E - Polish blink, idle, eye tracking, fallback [0.5 hari]

- Custom auto-blink: delay random 3-8 s, tutup 75 ms, buka 150-300 ms. Lebih hidup dari blink SDK default yang terlalu metronom.
- `delete live2DModel.internalModel.breath`, ganti dengan kurva `ParamBreath` manual supaya napas tidak konflik dengan plugin.
- Eye tracking: `model.focus(x, y)` plus `ParamEyeBallX/Y` lerp manual dari posisi cursor.
- Idle saccade random saat tidak ada cursor movement, supaya mata tidak mati.
- Gotcha AIRI: idle motion model yang menganimasikan `ParamEyeBallX/Y` akan berebut dengan eye tracking. AIRI rename curve ID dengan prefix `_`. Pilih sample model dengan idle curve bersih lebih dulu, jangan langsung pakai hack.
- Error boundary: model gagal load, `.model3.json` rusak, core Cubism gagal dimuat. Semua harus jatuh ke avatar emoji dengan log jelas, tidak blank screen.
- Empty state saat belum ada aset: tampilkan instruksi unduh, bukan canvas hitam.
- Verify: `npm run lint`, `npx tsc --noEmit`, manual test interrupt di tengah bicara, refresh saat audio masih main, resize window.

### Sesi F - Sinkronisasi skill dan dokumentasi [0.25 hari]

- `.opencode/skill/avatar-frontend/SKILL.md` sekarang mendeskripsikan struktur yang tidak ada di repo (component R3F, `useLipsync.ts` yang belum pernah dibuat). Update supaya cocok dengan implementasi Live2D aktual, hapus bagian R3F/VRM yang menyesatkan, catat pola motion plugin dan gotcha Cubism core yang ditemukan di sesi B sampai E.
- `docs/roadmap.md:17` hapus avatar VRM placeholder sebagai DONE kalau sudah Live2D, atau turunkan jadi "revisited".
- `docs/architecture.md` tambahkan sub-bagian live2d: di mana aset diunduh, kenapa di-gitignore, lisensi core Cubism.
- `AGENTS.md` Peta Dokumentasi: cek apakah perlu menambah rujukan skill, tidak wajib kalau `avatar-frontend` sudah mencakup.
- Commit: `docs(avatar): sync avatar-frontend skill with live2d implementation`. Pesan bahasa Inggris, tanpa emoji dan tanpa em dash.

### Fase B - Model custom karakter Humi (paralel, tidak memblokir)

Tidak bisa dikerjakan agent. Butuh di luar scope kode.

1. Ilustrasi dasar berlapis: mata kiri/kanan, mulut, accumulate rambut, brows,>Optional aksesoris. Format sumber PSD, bukan PNG datar.
2. Separate mesh per part di Cubism Editor: mesh untuk kepala, rambut depan, rambut belakang, lengan, badan. Minimal mesh per part agar deformation tidak robek.
3. Param wajib didaftarkan: `ParamMouthOpenY`, `ParamMouthForm`, `ParamEyeLOpen`, `ParamEyeROpen`, `ParamEyeBallX/Y`, `ParamBrowLY/RY`, `ParamAngleX/Y/Z`, `ParamBodyAngleX/Y/Z`, `ParamBreath`, `ParamCheek`.
4. Motion group: `Idle`, plus minimal `Happy`, `Sad`, `Angry`, `Surprise`. Sisanya ditangani parameter fallback.
5. Expression `exp3.json` untuk ekspresi yang tidak bisa dari motion (misal `Blush`).
6. Export, taruh di `frontend/public/live2d/humi/`. Tidak di-commit, sesuai `.gitignore`.
7. Ganti hanya path di konfigurasi, tidak ada perubahan kode runtime.

Yang ditentukan model, bukan kode: berapa nilai `ParamMouthOpenY` per vokal. Kalau sample model dan model custom punya rentang parameter berbeda, mapping di `useEmotionMap.ts` mungkin perlu kalibrasi ulang. Budget 30 menit untuk ini.

### Fase C - Dual format VRM + Live2D (opsional, tunda)

AIRI tidak memakai driver interface tunggal, tapi renderer switch plus komponen per format (`packages/stage-ui/src/components/scenes/Stage.vue`, `stage-model.ts` `StageModelRenderer`). Kalau Humi mau dua-duanya:

- `avatarFormat.ts` jadi `'live2d' | 'vrm' | 'emoji'`
- VRM scene lazy import, tidak mount bersamaan dengan Pixi scene. Dua WebGL context di satu halaman berisiko, batas browser sekitar 8-16.
- Dep VRM sudah terpasang, jadi jalur ini murah kalau nanti dibutuhkan. Tapi jangan sekarang, satu format dulu sampai runtime Live2D stabil.
- VRM sebagai fallback yang bisa dipakai kalau lisensi Cubism_core jadi masalah untuk build publik.

## Dependencies

Wajib:

- `live2dcubismcore.min.js` (Cubism Core for Web 5.x), static asset, **tidak** lewat npm. Hanya sekali unduh, taruh `frontend/public/assets/js/`. Tidak di-commit.
- `pixi-live2d-display@0.4.0` (MIT, tapi runtime-nya tetap butuh Cubism Core propriety) plus entry point `/cubism4`. **Tidak perlu `patch-package`**, patch AIRI hanya untuk jalur `.zip` yang tidak kita pakai.
- **9 paket modular `@pixi/*` versi `6.5.10`**, bukan `pixi.js` monolitik. Enam di antaranya (`core`, `display`, `loaders`, `math`, `sprite`, `utils`) adalah peer dependency wajib `pixi-live2d-display@0.4.0`; tiga lagi (`app`, `ticker`, `extensions`) yang kita import langsung. `@pixi/interaction` tidak dipasang karena InteractionManager tidak dipakai. `6.5.10` adalah rilis Pixi 6 terakhir, tidak deprecated, sama dengan pin AIRI. Jangan naikkan ke Pixi 7 tanpa menaikkan `pixi-live2d-display` ke `0.5.0-beta` bersamaan, dan beta itu belum divalidasi.
- `overrides: { "gh-pages": "6.3.0" }` wajib ada untuk menetralkan CVE prototype pollution yang dibawa `pixi-live2d-display@0.4.0` lewat `dependencies` yang salah. Lihat catatan Sesi A, jangan dihapus diam-diam.
- Sample model Hiyori free material dari Live2D Inc, mirror `dist.ayaka.moe/live2d-models/`. Untuk dev pribadi saja.
- Vite alias opsional `@framework/*` ke internal Cubism framework, untuk mengurangi bundle noise.

Tidak perlu untuk POC: wLipSync AudioWorklet (RMS dari AnalyserNode cukup untuk lipsync yang acceptably good), MAGIC motion driver, JSZip (kecuali load model dari `.zip`), `pixi-filters`, Spine/MMD stack, eye tracking ambient-light.

Lisensi, ini yang paling sering terlewat:

| Artefak | Lisensi | Dampak ke Humi |
|---|---|---|
| Cubism Core for Web | Proprietary, Live2D Free Material License | POC privat aman. Build publik/komersial wajib cek ulang terms terbaru sebelum distribusi |
| `pixi-live2d-display` | MIT | Aman, tapi runtime tetap terikat Cubism Core |
| Hiyori sample model | Live2D Inc free material | Tidak boleh dipakai sebagai avatar Humi di build publik, hanya placeholder dev |
| Karakter Humi custom | Tergantung artist | Butuh agreement eksplisit soal hak distribusi sebelum publik |

Kesimpulan lisensi untuk roadmap: kalau Humi nanti jadi produk publik, ada tiga jalur. (a) Lisensi komersial Live2D, (b) model dari user dengan lisensi sendiri, (c) kembali ke VRM yang ekosistem free-nya lebih jelas. VRM tetap installed, jadi jalur (c) tidak mengunci kita.

## Risks

- **HIGH Model Live2D tidak ada dan tidak bisa dibuat agent.** Mitigasi: sample model untuk Fase A, model custom di Fase B paralel. Kalau Hiyori tidak cocok dengan aesthetic Humi, sample model lain (Natori, Haru) sebagai ganti, struktur kode tidak berubah.
- **HIGH Lisensi Cubism Core untuk distribusi.** Mitigasi: aset di-gitignore, tidak pernah ikut repo publik, catat di `docs/architecture.md` bahwa build publik butuh review lisensi terpisah. Jangan commit `live2dcubismcore.min.js`.
- **MEDIUM Version mismatch Pixi vs pixi-live2d-display.** Peer dependency sering tertinggal. Mitigasi: pin kedua versi eksplisit, verifikasi di `frontend/package-lock.json`, cek issue upstream sebelum upgrade. Jangan `npm update` Buta.
- **MEDIUM Cubism Core global load order.** Salah urutan bikin `Live2DCubismCore is not defined` dan seluruh bundle gagal. Mitigasi: script di `index.html` sebelum module entry, plus guard yang jelas, plus test hard reload tiap kali ubah `index.html`.
- **MEDIUM Idle motion vs eye tracking berebut parameter.** AIRI harus rename curve ID dengan prefix `_` untuk quad bypass. Mitigasi: pakai model dengan idle curve bersih dulu, dokumentasikan gotcha di skill, dan jadikan rename sebagai fallback bukan default.
- **MEDIUM ExpressionManager dan eyeBlink SDK menimpa plugin custom.** Dua penulis ke parameter sama tiap frame. Mitigasi: null-kan SDK manager saat custom aktif, jalankan plugin di tahap `final` motion pipeline dengan `handled` flag.
- **MEDIUM Mulut menggantung setelah bicara selesai.** Motion idle yang punya keyframe `ParamMouthOpenY` akan reopen mulut setelah lipsync lepas. Mitigasi: handoff 3 langkah (release 200 ms, hold 500 ms di 0, baru lepas ownership), sudah ditulis di Sesi C.
- **MEDIUM 25 emotion tidak semua punya motion file.** Sample model umumnya punya 4-9 grup. Mitigasi: dua lapis mapping, motion group untuk subset dan parameter fallback untuk sisanya. Semua 25 tetap punya entri di kode.
- **LOW Bundle membengkak.** `pixi-live2d-display` plus Cubism framework itu besar, dan dipaketkan bersama VRM yang sekarang masih terpasang. Mitigasi: dynamic import hanya saat format `live2d` aktif, HMR Development tetap ringan, plansGauge bundle size kalau prod. Dep VRM yang belum dipakai bisa dihapus di Fase C atau dibiarkan.
- **LOW Dua WebGL context kalau dual format.** Mitigasi: mount satu canvas per satu waktu, bukan dua canvas bersamaan.
- **LOW Drift antara skill dan kode.** Skill `avatar-frontend` sekarang mendeskripsikan file yang tidak ada, jadiAnyone yang mengikuti skill saja akan mencari file yang tidak pernah ada. Mitigasi: Sesi F, dan update skill di commit yang sama dengan perubahan struktur.

## Estimated Complexity

MEDIUM untuk Fase A sampai F, sekitar 3-4 hari solo. Fase B (model custom) adalah HIGH, 1-6 minggu, dan sepenuhnya di luar kemampuan coding agent. Fase C (dual format) adalah LOW tambahan karena dep VRM sudah ada, tapi ditunda sampai Live2D stabil.

Sequencing: Sesi A sampai E adalah satu rantai karena tiap sesi bergantung pada output sesi sebelumnya. Sesi F bisa paralel dengan E tapi lebih aman setelah E. Fase B dimulai dari nol dan berjalan paralel dengan seluruh Fase A, tanpa coupling kode.

## Acceptance Criteria (Fase A selesai bila)

- [x] Model Live2D render di `localhost:5173`, console bersih — terbukti dengan Cubism Core 5.1.0 dan model Hiyori, 17 request aset 200
- [ ] Mulut bergerak sinkron audio TTS, menutup bersih di akhir utterance dan saat interrupt — Sesi C
- [ ] Semua 25 emotion di `protocol.ts:4-30` punya entri mapping, tidak ada silent drop — Sesi D
- [ ] Auto-blink natural, napas jalan, eye tracking jalan — Sesi E
- [x] Gagal load model atau Cubism Core hilang, jatuh ke avatar emoji dengan pesan jelas, tidak blank screen
- [x] `npm run lint` dan `npx tsc --noEmit` hijau di `frontend/`
- [x] `git ls-files` tidak mengandung `*.moc3`, `*.model3.json`, `live2dcubismcore.min.js`
- [x] D2 di `docs/architecture.md` punya baris revisit dengan alasan
- [ ] `.opencode/skill/avatar-frontend/SKILL.md` cocok dengan implementasi aktual — Sesi F
- [x] Nol perubahan di `gateway/`, `ai-service/`, dan `protocol-contract/SKILL.md` (format-agnostic, diverifikasi)

## Decisions Log

- 2026-10-02: Sesi A selesai. Keputusan avatar pindah ke Live2D dicatat sebagai `D12` (bukan `D13` seperti draft, karena `D12` belum pernah dipakai di repo ini dan nomor melompat terlihat seperti keputusan hilang).
- 2026-10-02: koreksi terhadap draft plan. Avatar pakai paket modular `@pixi/*@6.5.10`, bukan `pixi.js` monolitik. Draft salah karena `pixi-live2d-display@0.4.0` mencantumkan peer `@pixi/* ^6`, sementara `pixi.js` hanya dipakai oleh `0.5.0-beta` yang belum divalidasi.
- 2026-10-02: `patch-package` tidak ditambahkan. Patch AIRI hanya relevan untuk loader `.zip`, sedangkan Humi load model dari URL folder.
- 2026-10-02: `overrides.gh-pages = 6.3.0` disetujui. `pixi-live2d-display@0.4.0` mencium CVE critical lewat dependency yang salah deklarasi. Sudah diverifikasi `gh-pages` tidak pernah ter-import di `dist/cubism4.es.js` (0 kemunculan) dan hanya punya `bin`, jadi tidak terjangkau, tapi di-override supaya `npm audit` bersih dan tidak ada kode rentan di `node_modules`.
- 2026-10-02: empat pertanyaan terbuka masih belum terjawab, tidak memblokir Sesi B.
- 2026-10-02: **Sesi B selesai.** Cubism Core dimuat dinamis lewat `loadCubismCore()` lalu baru `await import("pixi-live2d-display/cubism4")`, bukan `<script>` di `index.html` seperti draft. Alasannya `dist/cubism4.es.js:5188` melempar `Error` di top level modul saat global core tidak ada, jadi import statis menjatuhkan seluruh aplikasi termasuk saat format masih `emoji`.
- 2026-10-02: `onload` pada loader Core hanya dianggap sukses kalau `window.Live2DCubismCore` benar-benar muncul. Dev server Vite menjawab HTTP 200 `text/html` untuk berkas Core yang tidak ada, dan `<script>` atas respons HTML tidak memicu `error`, hanya `load`.
- 2026-10-02: semua import Pixi dipindah ke dalam fungsi boot supaya renderer tidak masuk bundle utama. Bundle utama naik hanya 4.4 kB (206.61 ke 211.04 kB), sementara ~376 kB renderer menjadi 6 chunk terpisah yang hanya diunduh saat format `live2d`.
- 2026-10-02: `Live2DFactory.setupLive2DModel` dipilih menggantikan `Live2DModel.from`, karena `from` tidak ada di berkas tipe padahal ada di runtime `dist`.
- 2026-10-02: `app.destroy(true, { texture: false, baseTexture: false })`. Nilai default `texture: true` menghapus cache texture Pixi dan merusak remount kedua di StrictMode.
- 2026-10-02: sample model memakai Hiyori dari `Live2D/CubismWebSamples` tag `4-r.7` (Cubism 4), karena mirror `dist.ayaka.moe` memblokir dengan HTTP 403 dan tag `5-r.*` memuat model Cubism 5 yang tidak cocok dengan `pixi-live2d-display@0.4.0`.
- 2026-10-02: paket `live2dcubismcore` di npm ditolak. Tidak ada sumber resmi yang menghosting Core di luar SDK ber-EULA, dan menarik kode proprietary dari pihak ketiga yang tidak terverifikasi tidak sebanding dengan risikonya. Core jadi langkah manual yang dijelaskan di `frontend/public/live2d/README.md`.
- 2026-10-02: Core diambil dari `https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js`, domain resmi first-party yang tersedia di dokumentasi SDK, menggantikan langkah unduh manual dari ZIP EULA. Berkas 207 KB dan melaporkan Core 5.1.0; `pixi-live2d-display@0.4.0` tetap kompatibel karena ia memanggil API bentuk namespace (`Live2DCubismCore.Version.csmGetVersion`), bukan bentuk `csm*` datar. Dugaan awal bahwa Core ini tidak kompatibel karena bentrok versi ternyata salah, sebab kita salah membaca bentuk API-nya.
- 2026-10-02: `autoUpdate: false` dan update dipompa dari ticker aplikasi. Bawaan library mengikat model ke `Ticker.shared`, yang tidak pernah di-start di aplikasi ini, sehingga model load tapi tidak pernah menggambar.
- 2026-10-02: ukuran authored model ditangkap satu kali saat scale masih 1, lalu dipakai ulang oleh `fit()`. `model.width` yang dilaporkan model hidup sudah memasukkan `model.scale`, sehingga membacanya di dalam callback akan mengalikan scale berulang.
- 2026-10-02: matematika fit diekstrak ke `frontend/src/lib/fitModel.ts` dengan unit test, sesuai aturan repo bahwa logika murni wajib diuji. Termasuk kasus idempotensi yang mengunci bug scale-berlipat.
- Keputusan yang sudah bisa di-*assume* karena tidak mengubah scope Fase A: sample model dulu, jalur model custom terpisah, deps di-pin eksplisit, aset model tidak masuk repo.
- Keputusan yang menunggu jawaban user dan bisa mengubah plan: lihat `Open Questions`.

## Open Questions

Empat pertanyaan ini tidak memblokir Fase A, tapi mengubah Fase B dan Fase C:

1. **Konsep karakter sudah ada?** Baru deskripsi teks, ilustrasi jadi (PNG), atau sudah PSD berlapis (mata, mulut, rambut per layer)? Kalau sudah PNG datar, itu batas bawah yang realistis untuk membuat custom model. PSD berlapis jauh lebih mudah.
2. **Format final?** Live2D saja, ganti total VRM, atau dua-duanya switchable di Fase C?
3. **Siapa yang bikin model custom?** Belajar Cubism sendiri, komisi ke artist, atau sample dulu sampai produk benar-benar perlu custom?
4. **Sudah ada file `.model3.json` dari luar?** Kalau ada, Fase B langsung hilang dan hanya perlu integrasi.

## User Answer
1. Konsep sudah ada. Bahkan sudah ada gambar PNG characternya.
2. L2d saja untuk sekarang.
3. Biarkan saya saja dulu, sekarang pakai model gratisan saja.
4. belum
