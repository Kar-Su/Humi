# Design System Humi

Dokumen ini adalah **rasional**. Nilai warna, ukuran, dan durasinya tidak ada di sini; semuanya
berada di `design-system/humi/tokens.json` dan dikompilasi ke `frontend/src/styles/tokens.css`.

| Berkas | Isi | Siapa yang memiliki |
|---|---|---|
| `tokens.json` | nilai token tiga lapis, satu-satunya sumber kebenaran | manusia |
| `frontend/src/styles/tokens.css` | hasil generate, jangan diedit tangan | mesin |
| `MASTER.md` (dokumen ini) | alasan di balik setiap pilihan | manusia |

Kalau ada konflik antara nilai di dokumen ini dan `tokens.json`, **`tokens.json` yang menang**.
Dokumen yang menyalin angka hanya akan rusak begitu palet berubah.

## Alur kerja

```bash
# ubah tokens.json, lalu generate ulang
npm --prefix frontend run tokens

# jalankan test: memverifikasi kontras dan memastikan CSS tidak basi
npm --prefix frontend test
```

`frontend/src/lib/tokens.test.ts` memuat `tokens.json` secara langsung, menghitung rasio kontras
WCAG 2.2, dan gagal kalau ada pasangan yang turun di bawah ambangnya. Test yang sama juga
memastikan setiap warna semantic di `tokens.json` muncul dengan nilai yang sama di
`tokens.css`, jadi **`tokens.css` yang basi ikut ketahuan**.

Tailwind v4 membaca token lewat blok `@theme inline` di `frontend/src/index.css`, yang memetakan
nama semantic ke nama pendek Tailwind. Komponen menulis `bg-panel`, bukan `var(--color-surface)`
dan bukan `bg-[#151224]`.

> Catatan:`validate-tokens.cjs` dari skill `design-system` **tidak dipakai sebagai gerbang**.
> Script itu hanya menangkap hex mentah, sedangkan komponen Humi memakai kelas utilitas
> Tailwind, jadi `indigo-600` lolos tanpa terdeteksi. Ia belum Owned di mana pun dan menambah
> false sense of coverage.

## Batasan keras

Aturan ini tidak bisa ditawar oleh hasil generator mana pun. Kalau ada rekomendasi yang
bertentangan, yang menang adalah daftar di bawah.

1. **Dark-only.** Tidak ada mode terang, tidak ada token terang, tidak ada `prefers-color-scheme`
   yang menimpa. Product ini dipakai di layar laptop dengan avatar 3D gelap; mode terang
   akan merusak konsistensi visual dan menambah luas permukaan pengujian tanpa nilai produk.
2. **Semua copy Bahasa Indonesia.** termasuk `aria-label`, placeholder, dan pesan error.
   Istilah teknis yang memang pakai bahasa Inggris seperti `WebSocket` boleh.
3. **Tanpa font dari CDN.** Prinsip produk adalah self-hosted dan zero-cost. Font display memakai
   `ui-rounded` yang sudah ada di sistem operasi, dengan fallback `system-ui`. Kalau nanti butuh
   typeface kustom, file-nya harus ditaruh di `frontend/public/fonts/`, bukan di-link dari
   `fonts.googleapis.com`.
4. **Tanpa dependency baru untuk ikon.** Tiga ikon yang dibutuhkan ditulis sebagai inline SVG. Menambah paket ikon
   demi tiga gambar tidak sebanding dengan bobotnya.
5. **Avatar adalah elemen utama, bukan hiasan.** Panel avatar harus punya porsi layar minimal
   45 persen di mobile dan minimal 40 persen lebar di desktop. Mulut Humi harus selalu terbaca,
   karena itu tujuan produk.

## Palet

Dasar personalitasnya: Hu Tao memberi merah bara dan emas, Neuro-sama memberi sian dan magenta.
Base bukan netral murni, tapi hitam keunguan supaya tidak terasa seperti dashboard biasa.

Struktur tokennya tiga lapis. Lapisan **primitive** menyimpan ramp mentah, **semantic** memberi
nama menurut maksud, dan **component** mengunci pemakaian per komponen.

```
primitive.color.neutral.950          #0B0912
  └─ semantic.color.bg               var(--color-bg)
       └─ component.bubble.humi.bg   var(--bubble-humi-bg)
```

Peran yang ada, dalam bahasa Tailwind:

| Peran | Tailwind | Dipakai untuk |
|---|---|---|
| Latar | `bg-canvas` | latar halaman |
| Permukaan | `bg-panel` | panel avatar, kartu, input |
| Permukaan naik | `bg-raised` | bubble Humi, hover |
| Garis dekoratif | `border-line` | pemisah kartu, tidak wajib 3:1 |
| Garis kontrol | `border-edge` | border input dan tombol, wajib 3:1 |
| Teks utama | `text-ink` | body, judul |
| Teks sekunder | `text-ink-muted` | teks pendukung |
| Teks redup | `text-ink-subtle` | placeholder, label, timestamp |
| Bara, primer | `bg-brand`, `text-brand` | aksi utama, focus ring |
| Teks di atas bara | `text-brand-ink` | teks di dalam tombol bara |
| Bubble user | `bg-bubble` | gelembung pesan user |
| Emas, sekunder | `text-gold`, `bg-gold` | highlight, lencana |
| Sian, hidup | `text-live`, `bg-live` | indikator Humi sedang bicara |
| Magenta, emosi | `text-emotion`, `bg-emotion` | state emosi non-netral |
| Berhasil | `text-ok` | status koneksi |
| Gagal | `text-bad` | error, disconnect |
| Awas | `text-warn` | buffer penuh, degraded |

Nilai hexnya sengaja tidak ditulis di sini. Baca `tokens.json`, atau jalankan test untuk melihat
pasangan mana yang paling sempit marginnya.

### Verifikasi kontras

Kontras **tidak** dijaga oleh tabel di dokumen ini, tapi oleh
`frontend/src/lib/tokens.test.ts`. Test itu memuat `tokens.json`, menghitung luminance relatif
WCAG 2.2, dan menolak pasangan mana pun di bawah ambangnya.

Ambang yang dipakai:

| Jenis | Ambang | Alasan |
|---|---|---|
| Teks | 4.5:1 | teks terkecil yang kita kirim adalah `caption` 12px, jauh di bawah pengecualian large-text 24px |
| Garis kontrol, indikator state | 3:1 | WCAG 1.4.11 untuk komponen non-teks |

Dua pasang punya margin paling tipis dan tidak boleh direndahkan tanpa mengulang test:

- `fg-subtle` di `surface-raised` 5.62:1
- `ember` di `surface-raised` 4.95:1

Kalau butuh teks yang lebih redup, perkecil font-nya, jangan redupkan warnanya.

Sengaja **tidak** diberi ambang: `border` dekoratif di `surface` dan garis tepi bubble user.
Keduanya kosmetik dan tidak pernah jadi satu-satunya penanda kontrol, jadi tidak falls di bawah
WCAG 1.4.11.

## Tipografi

Rakitan ini sengaja tidak memakai `Fredoka` dan `Nunito` seperti saran generator. Generator
memilih typeface yang sangat membulat; bulat di ukuran 14px menurunkan keterbacaan teks panjang,
dan Humi dipakai sebagai alat ngobrol berkali-kali, bukan sekali-two kali.

Nilai aslinya ada di `primitive.fontFamily`. Ringkasnya:

```css
/* display: kepribadian membulat tanpa unduhan font */
--font-display: ui-rounded, "SF Pro Rounded", "Segoe UI Variable Display",
  system-ui, sans-serif;

/* body: sistem operasi, nol request jaringan */
--font-body: system-ui, -apple-system, "Segoe UI", Roboto,
  "Helvetica Neue", "Noto Sans", Arial, sans-serif;

/* data: untuk nilai teknis seperti latency dan versi */
--font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo,
  Consolas, monospace;
```

### Skala

Ukuran dan line-height-nya sudah jadi token `primitive.fontSize.*` dan `primitive.lineHeight.*`,
sehingga tidak perlu dicatat ulang di sini. Yang tidak bisa jadi token adalah Alasannya:

| Token | Ukuran | Line height | Tracking | Pemakaian |
|---|---|---|---|---|
| `caption` | 12px | 1.4 | 0.02em | label, timestamp, status pill |
| `body-sm` | 14px | 1.5 | normal | UI desktop, teks tombol |
| `body` | 16px | 1.6 | normal | isi bubble, input. **Wajib 16px di mobile** |
| `lead` | 18px | 1.45 | normal | subjudul panel |
| `title` | 20px | 1.3 | -0.01em | nama avatar, judul section |
| `display` | 28px | 1.2 | -0.02em | wordmark Humi |

Aturan isi:

- Body text minimal 16px di mobile. Di bawah itu zoom browser akan terpotong dan teks yang sudah
  diperbesar ikut terpotong. Ini bukan preferensi, ini batas keterbacaan.
- Panjang baris bubble dibatasi 65 sampai 75 karakter. Chat yang lebih lebar dari itu membaca
  seperti dokumen, bukan percakapan.
- Jangan pakai bobot di atas 600. Di teks 14px pada latar gelap, 700 mulai berjamur.
- Wordmark Humi memakai `font-display` dengan `letter-spacing` negatif supaya terasa seperti
  logo, bukan seperti heading.

## Spasi, radius, dan elevasi

Skala spasi kelipatan 4 ada di `primitive.spacing`, radius di `primitive.radius`. Yang layak
dijelaskan hanya perannya:

| Token | Pemakaian |
|---|---|
| `radius-sm` | input, tombol kecil, status pill |
| `radius-md` | tombol utama, bubble |
| `radius-lg` | panel avatar, kartu |
| `radius-full` | dot status, avatar lingkaran |

Elevasi tidak pakai `box-shadow` besar. Di latar gelap, bayangan hampir tak terlihat; yang
membedakan permukaan adalah **kenaikan luminans satu atau dua langkah**, yaitu rantai dari
`bg` ke `surface` ke `surface-raised`. Akses lewat `bg-canvas`, `bg-panel`, `bg-raised`.

Kalau memang butuh bayangan, pakai sangat halus dan hanya pada elemen yang benar-benar melayang,
contohnya popover. Tanpa alasan, surface yang lebih terang sudah cukup.

## Gerak

Token durasi tunggal supaya tidak ada angka acak di JSX.

Durasinya sudah jadi token `primitive.duration.*` supaya tidak ada angka acak di JSX.

| Token | Durasi | Easing | Pemakaian |
|---|---|---|---|
| `instant` | 90ms | `ease-out` | feedback tekan, kilatan dot status |
| `quick` | 150ms | `ease-out` | hover, perubahan warna |
| `normal` | 220ms | `standard` | bubble masuk, buka-tutup |
| `slow` | 380ms | `standard` | transisi panel, suppress |

Aturan gerak:

- Maksimal satu atau dua elemen bergerak per tampilan. Avatar sudah bergerak terus karena
  bernapas dan berkedip; menambah gerakan lain di halaman yang sama akan saling mengganggu.
- Properti yang boleh dianimasikan hanya `opacity`, `transform`, dan `color`. Animasikan `width`,
  `height`, `top`, atau `left` akan memicu layout thrash tiap frame.
- `transition: all` dilarang. Sebut properti yang berubah; `all` membuat animasi tidak terduga
  muncul saat properti lain berubah karena alasan yang tidak terkait.
- **Wajib ada `prefers-reduced-motion`**. Di bawah preferensi itu, durasi transisi non-esensial
  menjadi 1ms dan animasi berulang dihentikan. Lip-sync tetap boleh jalan karena itu informasi,
  bukan hiasan.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Komponen

### Panel avatar

- Desktop: grid `3fr 2fr`, tinggi mengikuti `100dvh`, bukan `100vh`. `100vh` di mobile
  mengabaikan chrome browser dan memotong footer composer.
- Mobile: ditumpuk, tinggi minimal `45dvh`.
- Latar `bg-panel`, radius `radius-lg`, padding 0 supaya canvas Pixi menempel penuh ke tepi.
- Keliling panel diberi cincin tipis yang warnanya mengikuti state: `border-line` saat diam,
  `border-live` saat Humi bicara. Cincin ini indikator status, jadi wajib 3:1 terhadap `surface`.

### Bubble chat

| Varian | Latar | Teks | Radius | Catatan |
|---|---|---|---|---|
| Humi | `bg-raised` | `text-ink` | `radius-md` | rata kiri, lebar maksimal 75ch |
| User | `bg-bubble` | `text-ink` | `radius-md` | rata kanan, tepi `border-line` tipis |
| Sistem | transparan | `text-ink-subtle` | `radius-sm` | contoh `caption`, tanpa gelembung |

Bubble masuk pakai `normal` dengan `opacity` dan `translateY(4px)` saja. Jangan pakai scale
overshoot di area chat; teks yang memantul terbaca sebagai tidak serius.

### Composer

- Baris composer **harus bisa wrap atau menyusut**. Di baseline sekarang input dan tiga tombol
  membentuk lebar minimum 430px, sehingga halaman melebar keluar viewport di 375px dan 414px.
  Ini bug nyata, bukan preferensi.
- Target sentuh minimal 24 CSS px, disarankan 44px, dengan jarak antar tombol minimal 8px.
- Tombol ikon wajib punya `aria-label` Bahasa Indonesia karena tidak punya teks yang terbaca.
- Urutan fokus mengikuti urutan visual: input, kirim, mikrofon, henti.

### Tombol

| Variant | Latar | Teks | Pemakaian |
|---|---|---|---|
| Primer | `bg-brand` | `text-brand-ink` | aksi utama saat ini |
| Sekunder | transparan + `border-edge` | `text-ink` | aksi sekunder, ikon |
| Bisu | transparan | `text-ink-subtle` | aksi yang paling jarang dipakai |

Semua tombol dapat `cursor-pointer`, focus ring `bg-brand` 2px dengan offset 2px, dan state disabled
sekali `opacity-50` **serta** `cursor-not-allowed`.

## Ikon

Inline SVG, `stroke-width` 1.75, `currentColor`, viewBox 24. Ketiga ikon yang dipakai:

- mikrofon, untuk mulai merekam
- stop, untuk menghentikan rekaman
- panah kirim untuk mengirim pesan

Aturan:

- Ikon di dalam kontrol interaktif memberi nama ke kontrolnya lewat `aria-label`, bukan lewat
  teks yang disembunyikan dengan `display: none`, karena itu membuat kontrol hilang dari
  accessibility tree.
- Ekspos state lewat `aria-pressed` atau `aria-busy` sesuai semantics kontrolnya.
- Emoji **dilarang** sebagai ikon. Emoji di dalam prose atau di nama bereaksi tetap boleh.

## Checklist pra-rilis

- [ ] Tidak ada emoji sebagai ikon; ikon sudah inline SVG
- [ ] `cursor-pointer` ada di semua elemen yang bisa diklik
- [ ] Semua ikon punya `aria-label` Bahasa Indonesia
- [ ] Focus ring terlihat di semua kontrol, termasuk di dalam bubble atau modal
- [ ] `prefers-reduced-motion` dihormati
- [ ] Body text 16px atau lebih di mobile
- [ ] Tidak ada scroll horizontal di 320, 375, 414, 768, 1024, dan 1440
- [ ] `npm --prefix frontend test` hijau, termasuk seluruh pasangan kontras
- [ ] Tidak ada `transition: all`
- [ ] Semua copy Bahasa Indonesia, termasuk pesan error

## Baseline yang diukur sebelum redesign

Fakta diambil dari DOM running di `localhost:5173`, bukan dari hasil baca kode. Ini yang harus
berubah.

| Item | Sekarang | Target |
|---|---|---|
| Lebar konten di 1440px | 672px (`max-w-2xl`), sisa 768px kosong | grid `3fr 2fr` memakai lebar penuh |
| Tinggi panel avatar | 128px tetap di semua ukuran | minimal 45dvh di mobile, minimal 40 persen di desktop |
| Lebar dokumen di 375px | 430px, melebar 55px | pas 375px |
| Lebar dokumen di 414px | 430px, melebar 16px | pas 414px |
| Ikon kontrol | emoji `🎙` dan `⏹` | inline SVG dengan `aria-label` |
| Palet | netral abu-abu plus satu `indigo-600` | token di `tokens.json` |
| Copy | `"Humi is typing..."` berbahasa Inggris | Bahasa Indonesia |

Satu target yang **sudah terpenuhi** sebelum dokumen ini ditulis, jadi tidak boleh dikerjakan ulang:
renderer Live2D sudah dimuat lewat `import()` dinamis di dalam `boot()`, sehingga jalur `emoji`
tidak pernah menyentuh chunk Pixi. Bundle utama 211.66 kB, enam chunk Pixi terpisah.
