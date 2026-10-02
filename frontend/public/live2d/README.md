# Aset Avatar Live2D

Folder ini tidak ikut di-commit. Isinya punya lisensi terpisah dari repo Humi,
jadi tiap developer mengunduh sendiri ke mesin lokal. Tanpa aset di sini,
frontend otomatis jatuh ke avatar emoji dan chat tetap jalan normal.

## Yang perlu diunduh

Dua hal, keduanya wajib, tidak boleh committed:

### 1. Cubism Core for Web

Runtime proprietary dari Live2D. Unduh **Cubism SDK for Web** dari
<https://www.live2d.com/en/sdk/download/web/>, lalu salin satu berkas:

```
Core/live2dcubismcore.min.js  ->  frontend/public/assets/js/live2dcubismcore.min.js
```

Paket ini menyediakan global `window.Live2DCubismCore`. Humi memuatnya lewat
`frontend/src/lib/cubismCore.ts`, bukan tag `<script>` di `index.html`.

Berkasnya dipublikasikan ulang di bawah
[Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html),
jadi boleh disalin, tapi tetap proprietary. Jangan asal ambil salinan dari
npm atau gist orang lain.

### 2. Model

Default repo ini memakai **Hiyori**, sample resmi Cubism 4 dari
<https://github.com/Live2D/CubismWebSamples> (tag `4-r.7`):

```
Samples/Resources/Hiyori/  ->  frontend/public/live2d/hiyori/
```

Salin seluruh isi foldernya, termasuk subfolder `Hiyori.2048/` dan `motions/`.
Ukurannya sekitar 4.8 MB.

Model ini milik Live2D dan hanya boleh dipakai untuk pengembangan pribadi,
tidak untuk distribusi maupun produk komersial. Kalau nanti ada model Humi
sendiri, taruh di `frontend/public/live2d/humi/` dan arahkan lewat env var.

## Mengaktifkan

Env var dibaca di build time, jadi set di `frontend/.env.local`:

```
VITE_AVATAR_FORMAT=live2d
# opsional, kalau model-nya bukan Hiyori
VITE_LIVE2D_MODEL_URL=/live2d/humi/humi.model3.json
```

Lalu `make up` dan buka `http://localhost:5173`.

Kalau Core atau model gagal dimuat, avatar kembali ke emoji dengan pesan
yang menyebut file mana yang kurang, bukan layar kosong.