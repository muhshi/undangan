# 💌 Undangan Digital – Muhshi Edition

![Thumbnail](/assets/images/banner.webp)

Undangan ini adalah versi kustom dari template undangan digital yang sudah terhubung penuh dengan backend Laravel API v1. Semua data acara, tamu, RSVP, komentar, like, hingga balasan komentar diambil dan disinkronkan secara real-time dari API.

## 🚀 Demo

Live preview: **[https://undangan.muhshi.my.id](https://undangan.muhshi.my.id)**

## ✨ Fitur Utama
- ✅ Integrasi penuh dengan API Laravel (`/api/v1`) untuk event, tamu, RSVP, komentar, like, dan balasan.
- ✅ Form RSVP dinamis: mendukung token tamu maupun input manual.
- ✅ Komentar & balasan dengan perhitungan waktu relatif yang akurat.
- ✅ Sistem like yang tersinkronisasi dengan backend, termasuk status like pengguna saat refresh.
- ✅ Optimasi aset dinamis (gallery, story video, QRIS, dll.) sesuai konfigurasi event.
- ✅ Mode self-host & demo: dikendalikan melalui atribut `data-*` pada `<body>`.
- ✅ Build bundle via esbuild untuk loading yang cepat.

## 🧩 Struktur Penting
- `index.html` – halaman undangan utama.
- `js/guest-local.js` – perekat front-end ↔ API.
- `js/connection/request.js` – helper fetch dengan kontrol error & no-cache.
- `api-implementation.md` – catatan endpoint backend yang dipakai.

## ⚙️ Persiapan & Pengembangan

```bash
# instal dependensi
npm install

# mode pengembangan (serve di http://localhost:8080)
npm run dev

# build bundel produksi
npm run build

# siapkan folder public/ untuk deploy static
npm run build:public
```

> Kamu bebas menggunakan `pnpm` atau `yarn`, sesuaikan dengan package manager favoritmu.

## 🔧 Konfigurasi Atribut `<body>`

Pastikan atribut berikut diset baik di `index.html` maupun `dashboard.html`:

| Atribut            | Contoh nilai                         | Keterangan |
|--------------------|--------------------------------------|------------|
| `data-url`         | `https://domainmu/api/v1`            | Base URL API backend (tanpa trailing slash). |
| `data-token-param` | `token`                              | Nama query string untuk token undangan. |
| `data-event-slug`  | `akad-nikah`                         | Slug event default ketika token tidak tersedia. |
| `data-confetti`    | `true` atau `false`                  | Menentukan animasi confetti saat undangan dibuka. |
| `data-audio`       | `https://.../backsound.mp3` (opsi)   | Jalur audio custom; bisa dikosongkan. |
| `data-time`        | `2025-12-07 08:00:00` (opsi)         | Override waktu hitung mundur jika perlu. |

Contoh:

```html
<body
  data-url="https://undangan.muhshi.my.id/api/v1"
  data-token-param="token"
  data-event-slug="akad-nikah"
  data-confetti="true"
  data-audio=""
  data-time=""
>
```

## 🔄 Alur Integrasi API (Ringkas)
1. Jika query `?token=` ada, front-end memanggil `GET /invites/{token}` untuk mendapatkan event + tamu.
2. Jika token kosong/tidak valid, fallback ke `GET /events/{slug}`.
3. Form RSVP mem-post ke `POST /rsvps` dengan payload dinamis (otomatis menggunakan token bila tersedia).
4. Komentar diambil dari endpoint `/rsvps` atau `/events/{slug}/rsvps` (pagination offset).
5. Like komentar: `POST /rsvps/{id}/like`.
6. Balasan komentar: `POST /rsvps/{id}/replies`.

Detail endpoint tersedia di [`api-implementation.md`](api-implementation.md).

## 🧪 Rekomendasi Pengujian
- Uji kirim RSVP baru (dengan & tanpa token).
- Uji komentar + balasan; refresh untuk memastikan waktu & like tetap konsisten.
- Verifikasi viewport mobile vs desktop (gallery, hero, slider).
- Jalankan `npm run lint:*` untuk cek konsistensi kode bila diperlukan.

## 📦 Deployment
1. Jalankan `npm run build:public`.
2. Upload isi folder `public/` ke hosting static (Netlify, Vercel, S3, dsb).
3. Pastikan backend Laravel-mu dapat diakses dari domain final (CORS, HTTPS, dsb).

## 🛠️ Tech Stack
- Bootstrap 5.3.8
- AOS 2.3.4
- Font Awesome 7.1.0
- Canvas Confetti 1.9.3
- esbuild 0.25.x
- Vanilla JavaScript

## 🎨 Kredit
Sebagian besar aset visual berasal dari Pixabay & koleksi pribadi. Silakan ganti dengan aset milikmu sendiri untuk produksi.

## 📝 Lisensi
Proyek ini tetap berada di bawah lisensi [MIT](https://opensource.org/licenses/MIT). Silakan modifikasi sesuai kebutuhan, sertakan atribusi apabila membagikan ulang.

---

Terima kasih sudah menggunakan Undangan Digital versi Muhshi. Semoga membantu menyiapkan momen spesialmu! 💐
