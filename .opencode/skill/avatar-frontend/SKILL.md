---
name: avatar-frontend
description: Konvensi frontend Humi — React + Vite + react-three-fiber + three-vrm untuk avatar 3D, lip-sync amplitudo Web Audio, mapping emosi ke blendshape, sumber model VRM berlisensi aman, dan pola komponen untuk pemula React. Gunakan saat mengerjakan frontend, avatar, VRM, lip-sync, ekspresi, atau UI chat.
---

# Avatar Frontend

Konteks developer proyek: backend engineer, baru belajar React. Pola di bawah sengaja minimal —
jangan perkenalkan pola kompleks (HOC, context nesting, dsb.) tanpa alasan kuat.

## Struktur Komponen

```
frontend/src/
├─ App.tsx              # layout: canvas avatar + panel chat
├─ components/
│  ├─ AvatarCanvas.tsx  # R3F Canvas, load VRM, animasi idle & lipsync
│  ├─ ChatPanel.tsx     # riwayat pesan + input teks
│  └─ MicButton.tsx     # capture mic (AudioWorklet) → audio_chunk
├─ lib/
│  ├─ protocol.ts       # TIPE PESAN — sinkron wajib dengan skill protocol-contract
│  ├─ useWebSocket.ts   # hook koneksi /ws + auto-reconnect
│  └─ useLipsync.ts     # AnalyserNode → amplitude → blendshape mulut
└─ store/chat.ts        # Zustand bila state melebihi 2 komponen
```

Aturan: komponen kecil (< 100 baris), state lokal dulu baru Zustand, TypeScript strict.

## Memuat VRM (three-vrm)

Pola inti (di dalam `useFrame` dari @react-three/fiber):

1. `GLTFLoader` + plugin `VRMLoaderPlugin` → `gltf.userData.vrm`.
2. Wajib tiap frame: `vrm.update(delta)`.
3. Rotasi kamera default VRM menghadap KE BELAKANG → putar 180° (`vrm.scene.rotation.y = Math.PI`).
4. Animasi otomatis gratis: auto blink + idle look-at dari paket
   `@pixiv/three-vrm-animation` (atau manual: blendshape `blink` sin-wave).

## Lip-Sync Amplitudo (pendekatan Fase 0)

TANPA protokol viseme — cukup analisis amplitudo audio yang sedang diputar:

1. Satu `<audio>` element tersembunyi memutar stream TTS.
2. `AudioContext.createAnalyser()` (fftSize 256) → `getByteFrequencyData`.
3. Rata-rata bin frekuensi rendah (vokal) → normalisasi 0..1.
4. Setiap frame: `expressionManager.setValue('aa', amp)` + reset `'ih'/'ou'` ke 0.
5. Saat `interrupt`: stop audio + reset semua nilai mulut ke 0.

Upgrade nanti (Fase 2+): estafet viseme dari teks (a-i-u-e-o) — jangan sekarang.

## Mapping Emosi → Blendshape

Tag dari `llm_sentence` (lihat `persona-prompting`) dipetakan preset:
`senang` → happy(0.7); `sedih` → sad(0.6); `kaget` → surprised(0.8);
`penasaran` → relaxed(0.3)+alis; `netral`/tidak ada → semua 0.
Transisi lerp 200 ms — JANGAN snap instan (terlihat murahan).

## Sumber Aset VRM Berlisensi Aman

- Sample resmi `pixiv/three-vrm` (AvatarSample A/B) — bebas untuk dev/test.
- VRoid Hub: pilih model dengan lisensi eksplisit mengizinkan penggunaan aplikasi;
  simpan file lisensi bersama model.
- LARANG commit file `.vrm` ke git (berat + lisensi) — taruh di folder lokal
  `frontend/public/models/` yang sudah di-gitignore; dokumentasikan sumber unduhan di README folder itu.

## Jebakan Umum (untuk pemula React)

- Effect tanpa dependency array = loop render. Koneksi WS dibuat SEKALI (array kosong).
- Jangan panggil setState di dalam render.
- AudioContext WAJIB dibuat setelah gesture user (klik tombol mic) — kebijakan autoplay browser.
- Hot-reload kadang membuat duplikat koneksi WS saat eksperimen — refresh manual bila aneh.
