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

### Sesi B - Runtime minimal: load model dan render [1-1.5 hari]

Pola dari AIRI `apps/stage-web/index.html:88` dan `packages/stage-ui-live2d/src/components/scenes/live2d/Canvas.vue`.

- `frontend/index.html` tambah `<script src="/assets/js/live2dcubismcore.min.js"></script>` **sebelum** `<script type="module" src="/src/main.ts">`. Cubism core dievaluasi sebagai global script, bukan npm import, dan harus tersedia sebelum `pixi-live2d-display` import dievaluasi.
- Tambah guard di `frontend/index.html` atau entry TS: kalau `window.Live2DCubismCore` undefined, jangan crash, tampilkan fallback.
- `frontend/src/components/Live2DStage.tsx` baru:
  - `const { Application, Ticker }` dari `pixi.js`, `Live2DModel, Live2DFactory` dari `pixi-live2d-display/cubism4`
  - `Live2DModel.registerTicker(Ticker)` **sebelum** instantiate model, kalau tidak model tidak ikut gerak
  - `extensions.add(TickerPlugin)`, `extensions.add(BatchRenderer)`. **Jangan** add `InteractionManager`, interaksi digerakkan manual supaya cursor eye tracking bisa di-wire nanti tanpa konflik
  - `new Application({ backgroundAlpha: 0, preserveDrawingBuffer: true, resolution: 1 })`
  - `new Live2DModel()` lalu `await Live2DFactory.setupLive2DModel(model, { url, id }, { autoInteract: false })`
  - mount ke container, `resize` observer untuk canvas
  - cleanup: `app.destroy(true)` dan putuskan ticker saat unmount, kalau tidak leak GPU dan context
- `frontend/src/lib/avatarFormat.ts` baru: `type AvatarFormat = 'live2d' | 'emoji'`, default `emoji` sampai aset terunduh. Nilai dari `import.meta.env.VITE_AVATAR_FORMAT` supaya bisa ganti tanpa rebuild.
- `frontend/src/components/AvatarCanvas.tsx` jadi host tipis: kalau format `live2d` render `<Live2DStage emotion analyser nowSpeaking />`, kalau `emoji` pertahankan `GLYPH` map yang sekarang sebagai fallback. Jangan hapus jalur emoji, itu satu-satunya tampilan yang jalan sebelum aset ada.
- Sample model: unduh Hiyori free material (mirror `dist.ayaka.moe/live2d-models/`) ke `frontend/public/live2d/humi/`. Instructions unduh masuk README, bukan di-commit asset-nya.
- Verify: `npm run lint`, `npx tsc --noEmit`, `make up` lalu buka `localhost:5173`, model terlihat, auto-blink jalan.

Acceptance: model render di browser, tidak ada error console, zero request 404 ke aset.

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

- [ ] Model Live2D render di `localhost:5173`, console bersih
- [ ] Mulut bergerak sinkron audio TTS, menutup bersih di akhir utterance dan saat interrupt
- [ ] Semua 25 emotion di `protocol.ts:4-30` punya entri mapping, tidak ada silent drop
- [ ] Auto-blink natural, napas jalan, eye tracking jalan
- [ ] Gagal load model atau Cubism Core hilang, jatuh ke avatar emoji dengan pesan jelas, tidak blank screen
- [ ] `npm run lint` dan `npx tsc --noEmit` hijau di `frontend/`
- [ ] `git ls-files` tidak mengandung `*.moc3`, `*.model3.json`, `live2dcubismcore.min.js`
- [ ] D2 di `docs/architecture.md` punya baris revisit dengan alasan
- [ ] `.opencode/skill/avatar-frontend/SKILL.md` cocok dengan implementasi aktual
- [ ] Nol perubahan di `gateway/`, `ai-service/`, dan `protocol-contract/SKILL.md` (format-agnostic, diverifikasi)

## Decisions Log

- 2026-10-02: Sesi A selesai. Keputusan avatar pindah ke Live2D dicatat sebagai `D12` (bukan `D13` seperti draft, karena `D12` belum pernah dipakai di repo ini dan nomor melompat terlihat seperti keputusan hilang).
- 2026-10-02: koreksi terhadap draft plan. Avatar pakai paket modular `@pixi/*@6.5.10`, bukan `pixi.js` monolitik. Draft salah karena `pixi-live2d-display@0.4.0` mencantumkan peer `@pixi/* ^6`, sementara `pixi.js` hanya dipakai oleh `0.5.0-beta` yang belum divalidasi.
- 2026-10-02: `patch-package` tidak ditambahkan. Patch AIRI hanya relevan untuk loader `.zip`, sedangkan Humi load model dari URL folder.
- 2026-10-02: `overrides.gh-pages = 6.3.0` disetujui. `pixi-live2d-display@0.4.0` mencium CVE critical lewat dependency yang salah deklarasi. Sudah diverifikasi `gh-pages` tidak pernah ter-import di `dist/cubism4.es.js` (0 kemunculan) dan hanya punya `bin`, jadi tidak terjangkau, tapi di-override supaya `npm audit` bersih dan tidak ada kode rentan di `node_modules`.
- 2026-10-02: empat pertanyaan terbuka masih belum terjawab, tidak memblokir Sesi B.
- Keputusan yang sudah bisa di-*assume* karena tidak mengubah scope Fase A: sample model dulu, jalur model custom terpisah, deps di-pin eksplisit, aset model tidak masuk repo.
- Keputusan yang menunggu jawaban user dan bisa mengubah plan: lihat `Open Questions`.

## Open Questions

Empat pertanyaan ini tidak memblokir Fase A, tapi mengubah Fase B dan Fase C:

1. **Konsep karakter sudah ada?** Baru deskripsi teks, ilustrasi jadi (PNG), atau sudah PSD berlapis (mata, mulut, rambut per layer)? Kalau sudah PNG datar, itu batas bawah yang realistis untuk membuat custom model. PSD berlapis jauh lebih mudah.
2. **Format final?** Live2D saja, ganti total VRM, atau dua-duanya switchable di Fase C?
3. **Siapa yang bikin model custom?** Belajar Cubism sendiri, komisi ke artist, atau sample dulu sampai produk benar-benar perlu custom?
4. **Sudah ada file `.model3.json` dari luar?** Kalau ada, Fase B langsung hilang dan hanya perlu integrasi.
