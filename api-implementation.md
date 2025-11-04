# **Brief untuk Codex: Integrasi Front-End “Undangan” ke API Backend**

## **Konteks**

Front-end HTML statis. Akan dihubungkan ke API Laravel v1:

- Base: `/api/v1`

- Tujuan: tarik data event \+ guest via token, render ke DOM, kirim RSVP.

## **Endpoints API v1**

- Auth: `POST /auth/login` → `{ ok, data:{ token, token_type, user{...} } }`

- Invite: `GET /invites/{token}` → `{ ok, data:{ guest{...}, event{...} } }`

- Events:

  - `GET /events` → `{ ok, data:[ event{...} ] }`

  - `GET /events/{slug}` → `{ ok, data: event{...} }`

  - Versi personalisasi: `GET /events/{slug}?invite_token={token}`

- RSVP:

  - `POST /rsvps` body `{ event_id|event_slug, token?, name?, guests_count, message }`

  - Dengan `token` valid → `guest_id` terisi, `name` diabaikan, status `approved`

  - Tanpa `token` → `name` wajib, `guest_id:null`, status `approved`

  - Token salah → `{ ok:false, error:{code:"VALIDATION_ERROR"}, fields:{ token:["invalid"] } }`

## **Contoh cURL & Respons (dipersingkat)**

Login:

`curl -X POST "http://127.0.0.1:8000/api/v1/auth/login" \`

`-H "Content-Type: application/json" \`

`-d '{ "email": "muhshi@gmail.com", "password": "********", "device_name": "cli-test" }'`

`# {"ok":true,"data":{"token":"<BearerToken>","token_type":"Bearer","user":{"id":2,"name":"M Abdul Muhshi","email":"muhshi@gmail.com"}}}`

Invite → event \+ guest:

`export API_BASE="http://127.0.0.1:8000/api/v1"`

`curl "$API_BASE/invites/2WPJkEg75fkv..."`

`# {"ok":true,"data":{"guest":{...},"event":{ "id":1,"title":"Akad Nikah","slug":"akad-nikah", "start_at":"2025-12-07T08:03:00+00:00","end_at":"2025-12-07T10:17:00+00:00", "location_name":"Masjid Al-Ikhlas","map_url":"https://...", "couple":{ groom{...}, bride{...} }, "content":{ "hero_image":"/storage/...jpeg", "opening_html":"<p>...</p>", "story":{"video":"/storage/...mp4","timeline":[...]}, "gallery":[], "gifts":[["transfer",...],["qris",...],["barang",...]], "socials":[...] }, "music":{"autoplay":true,"loop":true} } } }`

Events list:

`curl "$API_BASE/events"`

`# {"ok":true,"data":[ { "id":1,"title":"Akad Nikah","slug":"akad-nikah", ... }, ... ]}`

Event detail terpersonalisasi:

`curl "$API_BASE/events/akad-nikah?invite_token=2WPJkEg75fkv..."`

`# {"ok":true,"data":{ ...,"recipient_name":"Sahabat SMA Putri", "guest":{...} }}`

RSVP dengan token (nama otomatis dari guest):

`curl -X POST "$API_BASE/rsvps" \`

`-H "Content-Type: application/json" \`

`-d '{ "event_id": 1, "token": "2WPJkEg75fkv...", "guests_count": 2, "message": "Selamat ya!" }'`

`# {"ok":true,"data":{"id":1,"event_id":1,"guest_id":2,"name":"Sahabat SMA Putri","guests_count":2,"message":"Selamat ya!","status":"approved","created_at":"..." }}`

RSVP tanpa token (name wajib):

`curl -X POST "$API_BASE/rsvps" \`

`-H "Content-Type: application/json" \`

`-d '{ "event_id":1,"name":"Tamu Umum","guests_count":1,"message":"Barakallah!" }'`

`# {"ok":true,"data":{"id":3,"event_id":1,"guest_id":null,"name":"Tamu Umum","guests_count":1,"message":"Barakallah!","status":"approved","created_at":"..." }}`

Token salah:

`curl -X POST "$API_BASE/rsvps" -H "Content-Type: application/json" \`

`-d '{ "event_id": 1, "token": "guest-token-optional","guests_count":2,"message":"..." }'`

`# {"ok":false,"error":{"code":"VALIDATION_ERROR"},"fields":{"token":["invalid"]}}`

## **Struktur Front-End (ringkas)**

SS folder `js/`:

`js/`

`app/`

    `admin/...`

    `guest/`

      `audio.js`

      `guest.js`

      `image.js`

      `progress.js`

      `video.js`

`common/`

    `language.js`

    `offline.js`

    `session.js`

    `storage.js`

    `theme.js`

    `util.js`

`connection/`

    `cache.js`

    `dto.js`

    `request.js`

`libs/`

`bootstrap.js, confetti.js, loader.js`

`guest-local.js  ← file perekat API→DOM (baru/diupdate)`

`guest.js        ← bundle build/dari rilis`

## **Tugas untuk Codex**

### **A. Edit HTML**

1. Hapus duplikat `<script src="./dist/guest.js"></script>` sehingga hanya satu.

Tambah atribut di `<body>`:

`<body`

`data-url="http://127.0.0.1:8000/api/v1"`

`data-token-param="token"`

`data-event-slug="akad-nikah"`

`data-confetti="true"`

`data-audio=""`

`data-time=""`

`>`

2.
3.  Biarkan markup DOM apa adanya. Binding via JS.

### **B. Buat helper request: `js/connection/request.js`**

`export const API = (() => {`

`const BASE = document.body.dataset.url?.replace(/\/+$/, "") || "";`

`async function parse(r) { const js = await r.json().catch(()=>({}));`

    `if (!r.ok || js?.ok === false) throw js?.error || js; return js?.data ?? js; }`

`` async function get(path, opt={})  { return parse(await fetch(`${BASE}${path}`, { headers:{Accept:"application/json"}, ...opt })); } ``

`` async function post(path, body)   { return parse(await fetch(`${BASE}${path}`, { method:"POST", headers:{ "Content-Type":"application/json", Accept:"application/json" }, body: JSON.stringify(body) })); } ``

`return { get, post };`

`})();`

### **C. Implement perekat API→DOM: `js/guest-local.js`**

Target:

- Jika query `?token=...` ada → panggil `GET /invites/{token}`.

- Jika tidak ada → panggil `GET /events/{slug}` memakai `data-event-slug`.

- Isi elemen:

  - `[data-bind="event.date"]` → tanggal lokal dari `start_at`

  - `[data-bind="event.time"]` → rentang jam dari `start_at`–`end_at`

  - `#guest-name` → nama guest atau “Tamu Undangan”

  - `#maps-link` → `href = event.map_url` jika ada

  - Hero: `content.hero_image` → set ke `data-src` hero

  - Story video: `content.story.video` → set `#video-love-stroy[data-src]`

  - Gallery: opsional, mapping dari `content.gallery[]`

  - Gifts: opsional, isi tiga blok Transfer/QR/Gift dari `content.gifts`

  - Music: jika `event.music.file` → set `document.body.dataset.audio`

  - Countdown: jika `data-time` kosong → isi dengan `event.start_at` (`YYYY-MM-DD HH:mm:ss`)

- RSVP:

  - Tombol “Send” pada form ucapan akan override dan kirim `POST /rsvps`.

  - Payload:

    - Jika ada `token`: `{ event_id, token, guests_count, message }`

    - Jika tanpa token: `{ event_id, name, guests_count, message }`

  - Tampilkan alert sederhana sukses/gagal.

Kode yang diminta:

`// js/guest-local.js`

`import { API } from "./connection/request.js";`

`const qs  = (s, r=document) => r.querySelector(s);`

`const qsa = (s, r=document) => [...r.querySelectorAll(s)];`

`const params = new URLSearchParams(location.search);`

`const TOKEN_PARAM = document.body.dataset.tokenParam || "token";`

`const TOKEN = params.get(TOKEN_PARAM);`

`const SLUG  = document.body.dataset.eventSlug;`

`const el = {`

`root: qs("#root"), welcome: qs("#welcome"),`

`guestName: qs("#guest-name"),`

`eventDate: qsa('[data-bind="event.date"]'),`

`eventTime: qsa('[data-bind="event.time"]'),`

`mapsLink: qs("#maps-link"),`

`heroImgs: qsa('img[data-src="./assets/images/bg.webp"]'),`

`storyBtn: qs('button[onclick*="showStory"]'),`

`formName: qs("#form-name"),`

`formPresence: qs("#form-presence"),`

`formComment: qs("#form-comment"),`

`loading: qs("#loading"),`

`};`

`function fmtDate(d){ return new Date(d).toLocaleDateString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric"}); }`

`function fmtTime(a,b){`

`const s=new Date(a).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});`

`` return b? `${s}–${new Date(b).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})} WIB` : `${s} WIB`; ``

`}`

`let CURRENT_EVENT = null;`

`async function loadData(){`

`let event, guest=null;`

`if (TOKEN){`

    ``const res = await API.get(`/invites/${encodeURIComponent(TOKEN)}`);``

    `event = res.event; guest = res.guest;`

`} else {`

    ``event = await API.get(`/events/${encodeURIComponent(SLUG||"")}`);``

`}`

`CURRENT_EVENT = event;`

`// nama penerima`

`` el.guestName.innerHTML = `<p class="m-0">Kepada Yth</p><h3 class="m-0">${guest?.name || "Tamu Undangan"}</h3>`; ``

`// tanggal & jam`

`el.eventDate.forEach(n => n.textContent = event.start_at ? fmtDate(event.start_at) : "");`

`el.eventTime.forEach(n => n.textContent = fmtTime(event.start_at, event.end_at));`

`// maps`

`if (event.map_url && el.mapsLink) el.mapsLink.href = event.map_url;`

`// hero`

`const hero = event.content?.hero_image;`

`if (hero) el.heroImgs.forEach(img => img.setAttribute("data-src", hero));`

`// story`

`const story = event.content?.story || {};`

`if (story.video && el.storyBtn){`

    `const box = qs("#video-love-stroy");`

    `if (box) box.dataset.src = story.video;`

`} else { el.storyBtn?.classList.add("d-none"); }`

`// music`

`if (event.music?.file) document.body.dataset.audio = event.music.file;`

`// countdown`

`if (!document.body.dataset.time && event.start_at){`

    `document.body.dataset.time = event.start_at.replace("T"," ").substring(0,19);`

`}`

`// prefill name`

`if (guest?.name) el.formName.value = guest.name;`

`// tampilkan UI`

`el.loading?.setAttribute("style","opacity:0");`

`el.welcome?.setAttribute("style","opacity:1");`

`el.root?.classList.remove("opacity-0");`

`}`

`async function sendRSVP(btn){`

`try{`

    `btn.disabled = true;`

    `const payload = {`

      `event_id: Number(CURRENT_EVENT?.id || 0),`

      `guests_count: Number(el.formPresence.value) === 1 ? 1 : 0,`

      `message: (el.formComment.value || "").trim(),`

    `};`

    `if (TOKEN) payload.token = TOKEN; else payload.name = (el.formName.value || "").trim();`

    `await API.post("/rsvps", payload);`

    `alert("Terima kasih. Ucapan tersimpan.");`

`} catch(e){`

    `alert(e?.message || "Gagal mengirim.");`

`} finally{`

    `btn.disabled = false;`

`}`

`}`

`window.addEventListener("DOMContentLoaded", () => {`

`loadData().catch(console.error);`

`const sendBtn = document.querySelector('button[onclick="undangan.comment.send(this)"]');`

`if (sendBtn) sendBtn.onclick = () => sendRSVP(sendBtn);`

`});`

### **D. Aturan error handling**

- Jika `fetch` gagal jaringan → tampilkan alert “Gagal fetch. Cek koneksi.”

- Jika respons `{ ok:false }` atau 4xx/5xx:

  - Jika `error.code === "VALIDATION_ERROR"` dan ada `fields.token` → alert “Token undangan tidak valid.”

  - Selain itu, tampilkan `error.message` jika ada.

### **E. CORS**

Pastikan backend mengizinkan origin front-end. Tidak perlu ditangani di client.

## **Kriteria Selesai**

- Memuat halaman dengan `?token=...` menampilkan:

  - Nama penerima sesuai guest

  - Tanggal dan jam sesuai event

  - Link Maps aktif

  - Hero gambar, video story, dan audio jika tersedia

- Tanpa `token`, memakai `data-event-slug` dan tetap render.

- RSVP:

  - Dengan token: tersimpan, `name` otomatis dari guest

  - Tanpa token: wajib isi nama, tersimpan

- Error token invalid ditangani dengan alert jelas.

- Tidak ada duplikat pemanggilan `guest.js`.

## **Catatan**

- Jangan ubah file bundle third-party di `dist/`.

- Hanya tambah/ubah di `js/connection/request.js` dan `js/guest-local.js`.

- Hindari query ke API saat `data-url` kosong.
