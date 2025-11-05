import { API } from "./connection/request.js";

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

const BODY = document.body;
const params = new URLSearchParams(window.location.search);
const TOKEN_PARAM = BODY?.dataset?.tokenParam || "token";
const TOKEN = params.get(TOKEN_PARAM);
const EVENT_SLUG = BODY?.dataset?.eventSlug || "";

const API_URL = (() => {
  try {
    const raw = (BODY?.dataset?.url || "").trim();
    if (!raw) return null;
    return new URL(raw, window.location.href);
  } catch {
    return null;
  }
})();
const API_ORIGIN = API_URL ? `${API_URL.protocol}//${API_URL.host}` : "";

const ID_LOCALE = "id-ID";

const el = {};
let CURRENT_EVENT = null;
let CURRENT_GUEST = null;
let countdownTimer = null;

const assignElements = () => {
  el.root = qs("#root");
  el.welcome = qs("#welcome");
  el.guestName = qs("#guest-name");
  el.eventDate = qsa('[data-bind="event.date"]');
  el.eventTime = qsa('[data-bind="event.time"]');
  el.eventTitle = qsa('[data-bind="event.title"]');
  el.mapsLink = qs("#maps-link");
  el.desktopSlides = qs("#desktop-slides");
  el.mobileBackdrop = qs("#mobile-hero-bg");
  el.mobileCircle = qs("#mobile-hero-circle");
  el.storyBtn = qs('button[onclick*="showStory"]');
  el.storyBox = qs("#video-love-stroy");
  el.formName = qs("#form-name");
  el.formPresence = qs("#form-presence");
  el.formComment = qs("#form-comment");
  el.loading = qs("#loading");
  //el.sendBtn = qs('button[onclick="undangan.comment.send(this)"]');
  el.sendBtn = qs("#btn-send-rsvp");
};

const resolveAsset = (path) => {
  if (!path) return "";
  try {
    return new URL(path, API_ORIGIN || window.location.origin).href;
  } catch {
    return path;
  }
};

const setTextAll = (nodes, value) => {
  nodes?.forEach((node) => {
    if (node) node.textContent = value ?? "";
  });
};

const rawString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const toDate = (input) => {
  if (!input) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input !== "string") {
    const asDate = new Date(input);
    return Number.isNaN(asDate.getTime()) ? null : asDate;
  }
  const normalized = input.includes("T") ? input : input.replace(" ", "T");
  let parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    parsed = new Date(`${normalized}Z`);
  }
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const extractDateString = (iso) => {
  const raw = rawString(iso).trim();
  if (!raw) return "";
  if (raw.includes("T")) return raw.split("T")[0] || "";
  return raw.split(" ")[0] || raw;
};

const extractTimeString = (iso) => {
  const raw = rawString(iso);
  if (!raw) return "";
  const match = raw.match(/(\d{2}:\d{2})/);
  if (!match) return "";
  return match[1].replace(":", ".");
};

const fmtDate = (iso) => {
  const date = toDate(iso);
  if (!date) return extractDateString(iso);
  return date.toLocaleDateString(ID_LOCALE, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const fmtTimeRange = (startIso, endIso) => {
  const start = toDate(startIso);
  if (!start) {
    const startFallback = extractTimeString(startIso);
    if (!startFallback) return "";
    const endFallback = extractTimeString(endIso);
    if (!endFallback || startFallback === endFallback) {
      return `${startFallback} WIB`;
    }
    return `${startFallback}–${endFallback} WIB`;
  }
  const opts = { hour: "2-digit", minute: "2-digit", hour12: false };
  const startText = start.toLocaleTimeString(ID_LOCALE, opts).replace(":", ".");
  if (!endIso) return `${startText} WIB`;
  const end = toDate(endIso);
  if (!end) return `${startText} WIB`;
  const endText = end.toLocaleTimeString(ID_LOCALE, opts).replace(":", ".");
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay && startText === endText) return `${startText} WIB`;
  return `${startText}–${endText} WIB`;
};

const startCountdown = (startIso) => {
  const parsed = toDate(startIso);
  if (!parsed) return;
  const target = parsed.getTime();
  const dayEl = qs("#day");
  const hourEl = qs("#hour");
  const minuteEl = qs("#minute");
  const secondEl = qs("#second");
  if (!dayEl || !hourEl || !minuteEl || !secondEl) return;

  const tick = () => {
    const now = Date.now();
    let diff = Math.max(0, target - now);
    const days = Math.floor(diff / 86400000);
    diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000);
    diff -= hours * 3600000;
    const minutes = Math.floor(diff / 60000);
    diff -= minutes * 60000;
    const seconds = Math.floor(diff / 1000);
    dayEl.textContent = String(days).padStart(2, "0");
    hourEl.textContent = String(hours).padStart(2, "0");
    minuteEl.textContent = String(minutes).padStart(2, "0");
    secondEl.textContent = String(seconds).padStart(2, "0");
  };

  tick();
  if (countdownTimer) window.clearInterval(countdownTimer);
  countdownTimer = window.setInterval(tick, 1000);
};

const alertError = (err) => {
  if (!err) return;
  if (err.code === "VALIDATION_ERROR" && err.fields?.token) {
    alert("Token undangan tidak valid.");
    return;
  }
  if (err.message === "API base URL is not configured") {
    console.warn(err.message);
    return;
  }
  const message = err.message || "Terjadi kesalahan.";
  alert(message);
};

const getVal = (obj, path) => {
  if (!obj || !path) return "";
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : ""), obj);
};

function forceReplaceStoryVideo() {
  const box = document.getElementById("video-love-stroy");
  if (!box) return;
  let url = box.dataset.src || "";
  if (!url) return;
  try {
    if (!url.startsWith("blob:")) url = resolveAsset(url);
  } catch {}
  const old = box.querySelector("video");
  if (old) {
    try {
      old.pause();
    } catch {}
    old.remove();
  }
  const cls = box.dataset.vidClass || "w-100 rounded-4 shadow-sm m-0 p-0";
  const vid = document.createElement("video");
  vid.className = cls;
  vid.controls = true;
  vid.playsInline = true;
  vid.preload = "auto";
  vid.setAttribute("disableremoteplayback", "");
  vid.setAttribute("disablepictureinpicture", "");
  vid.setAttribute(
    "controlslist",
    "noremoteplayback nodownload noplaybackrate"
  );
  vid.src = url;
  box.appendChild(vid);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      });
    },
    { threshold: 0.5 }
  );
  observer.observe(vid);
  console.log("[story video ready]", url);
}

function setBindings(event, guest) {
  const data = {
    event,
    guest,
    couple: event?.couple || {},
    content: event?.content || {},
  };

  document.querySelectorAll("[data-bind], [data-render]").forEach((el) => {
    const path = el.dataset.bind;
    const hideIfEmpty = el.dataset.hideOnEmpty !== "false";
    const bindAttr = el.dataset.bindAttr;
    const render = el.dataset.render;

    let v = getVal(data, path);
    if (v == null || typeof v === "object") v = "";

    if (path === "event.date") {
      const value =
        fmtDate(event?.start_at) || extractDateString(event?.start_at);
      el.textContent = value;
      if (!value && hideIfEmpty) el.classList.add("d-none");
      else el.classList.remove("d-none");
      return;
    }
    if (path === "event.time") {
      const value = fmtTimeRange(event?.start_at, event?.end_at) || "";
      el.textContent = value;
      if (!value && hideIfEmpty) el.classList.add("d-none");
      else el.classList.remove("d-none");
      return;
    }

    if (render === "timeline") {
      const arr = getVal(data, path);
      if (Array.isArray(arr) && arr.length) {
        el.innerHTML = renderTimeline(arr);
        el.classList.remove("d-none");
      } else {
        el.innerHTML = "";
        if (hideIfEmpty) el.classList.add("d-none");
      }
      return;
    }

    if (el.dataset.render === "subevents") {
      const items = Array.isArray(event?.sub_events) ? event.sub_events : [];
      if (!items.length) {
        el.innerHTML = "";
        el.classList.add("d-none");
        return;
      }
      const baseDate = extractDateString(event?.start_at) || "";
      const toIso = (hm) => {
        if (!baseDate || !hm) return null;
        const hhmm = String(hm).replace(".", ":").slice(0, 5);
        return `${baseDate}T${hhmm}:00`;
      };
      const html = items
        .map((it) => {
          const title = (it.title || "").trim() || "Acara";
          const startIso = toIso(it.start_time || it.start_at);
          const endIso = toIso(it.end_time || it.end_at);
          const jam = fmtTimeRange(startIso, endIso) || "";
          const desc = (it.description || "").trim();
          const dress = (it.dress_code || "").trim();
          return `
      <div class="py-2">
        <h2 class="font-esthetic m-0 py-2" style="font-size: 2rem">${title}</h2>
        ${jam ? `<p style="font-size: 0.95rem">${jam}</p>` : ""}
        ${desc ? `<p class="m-0" style="font-size: 0.95rem">${desc}</p>` : ""}
        ${
          dress
            ? `<p class="m-0 text-secondary" style="font-size: 0.85rem">Dress code: ${dress}</p>`
            : ""
        }
      </div>`;
        })
        .join("");
      el.innerHTML = html;
      el.classList.remove("d-none");
      return;
    }

    if (render === "gallery") {
      const list =
        (event?.content?.gallery || [])
          .map((it) => (typeof it === "string" ? it : it?.url))
          .filter(Boolean) || [];
      const imgs = list.length ? list : event?.content?.slider_images || [];
      if (!imgs.length) {
        el.innerHTML = "";
        if (hideIfEmpty) el.classList.add("d-none");
        return;
      }
      const id = el.id || "gallery-carousel";
      const indicators = imgs
        .map(
          (_, i) => `
      <button type="button" data-bs-target="#${id}" data-bs-slide-to="${i}"
        ${
          i === 0 ? 'class="active" aria-current="true"' : ""
        } aria-label="Slide ${i + 1}"></button>`
        )
        .join("");
      const items = imgs
        .map((url, i) => {
          const src = resolveAsset(url);
          return `
        <div class="carousel-item ${i === 0 ? "active" : ""}">
          <img src="${src}" data-src="${src}" alt="image ${i + 1}"
               class="d-block img-fluid cursor-pointer" onclick="undangan.guest.modal(this)"/>
        </div>`;
        })
        .join("");
      el.innerHTML = `
      <div class="carousel-indicators">${indicators}</div>
      <div class="carousel-inner rounded-4">${items}</div>
      <button class="carousel-control-prev" type="button" data-bs-target="#${id}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#${id}" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
      </button>`;
      el.classList.remove("d-none");
      return;
    }

    if (el.dataset.render === "map-embed") {
      const q =
        event?.map_url ||
        [event?.location_name, event?.address].filter(Boolean).join(", ");
      const src = q ? (q.startsWith("http") ? q : mapsEmbedSrc(q)) : "";
      el.src = src.includes("/maps?q=") ? src : mapsEmbedSrc(q);
      el.classList.toggle("d-none", !src);
      return;
    }

    if (el.dataset.render === "gifts") {
      const raw = Array.isArray(event?.content?.gifts)
        ? event.content.gifts
        : [];
      if (!raw.length) {
        el.innerHTML = "";
        if (hideIfEmpty) el.classList.add("d-none");
        return;
      }
      const gifts = raw
        .map((g) => {
          const t = String(g?.type || "").toLowerCase();
          if (t === "transfer") {
            return {
              type: "transfer",
              name: g.name || g.account_name || "",
              bank: g.bank || g.label || "",
              account: g.account || g.account_number || "",
            };
          }
          if (t === "qris") {
            return {
              type: "qris",
              name: g.qris_name || g.name || "",
              image_url: g.qris_image
                ? resolveAsset(g.qris_image)
                : g.image_url
                ? resolveAsset(g.image_url)
                : "",
            };
          }
          if (t === "barang" || t === "gift") {
            return {
              type: "gift",
              name: g.recipient_name || g.name || "",
              phone: g.phone || "",
              address: g.address || "",
            };
          }
          return null;
        })
        .filter(Boolean);
      const html = gifts
        .map((g, i) => {
          const collapseId = `gift-${g.type}-${i}`;
          const icon =
            g.type === "transfer"
              ? "fa-money-bill-transfer"
              : g.type === "qris"
              ? "fa-qrcode"
              : "fa-gift";
          let inner = "";
          if (g.type === "transfer") {
            inner = `
        <div class="collapse" id="${collapseId}">
          <hr class="my-2 py-1" />
          ${
            g.bank
              ? `<p class="m-0" style="font-size:0.9rem"><i class="fa-solid fa-building-columns me-1"></i>${g.bank}</p>`
              : ""
          }
          <div class="d-flex justify-content-between align-items-center mt-2">
            <p class="m-0 p-0" style="font-size:0.85rem"><i class="fa-solid fa-credit-card me-1"></i>${
              g.account || "-"
            }</p>
            ${
              g.account
                ? `<button class="btn btn-outline-auto btn-sm shadow-sm rounded-4 py-0" style="font-size:0.75rem" data-copy="${g.account}" onclick="undangan.util.copy(this)"><i class="fa-solid fa-copy"></i></button>`
                : ""
            }
          </div>
        </div>`;
          }
          if (g.type === "qris") {
            inner = `
        <div class="collapse" id="${collapseId}">
          <hr class="my-2 py-1" />
          <div class="d-flex justify-content-center align-items-center">
            <img src="${
              g.image_url || "./assets/images/placeholder.webp"
            }" alt="QRIS" class="img-fluid rounded-3 mx-auto bg-white" style="max-width:200px"/>
          </div>
        </div>`;
          }
          if (g.type === "gift") {
            inner = `
        <div class="collapse" id="${collapseId}">
          <hr class="my-2 py-1" />
          ${
            g.phone
              ? `<div class="d-flex justify-content-between align-items-center mb-2">
            <p class="m-0 p-0" style="font-size:0.85rem"><i class="fa-solid fa-phone-volume me-1"></i>${g.phone}</p>
            <button class="btn btn-outline-auto btn-sm shadow-sm rounded-4 py-0" style="font-size:0.75rem" data-copy="${g.phone}" onclick="undangan.util.copy(this)"><i class="fa-solid fa-copy"></i></button>
          </div>`
              : ""
          }
          ${
            g.address
              ? `<div class="d-flex justify-content-between align-items-center">
            <p class="my-0 p-0 text-truncate me-2" style="font-size:0.85rem"><i class="fa-solid fa-location-dot me-1"></i>${g.address}</p>
            <button class="btn btn-outline-auto btn-sm shadow-sm rounded-4 py-0" style="font-size:0.75rem" data-copy="${g.address}" onclick="undangan.util.copy(this)"><i class="fa-solid fa-copy"></i></button>
          </div>`
              : ""
          }
        </div>`;
          }
          return `
      <div class="bg-theme-auto rounded-4 shadow p-3 mx-4 mt-4 text-start" data-aos="fade-up" data-aos-duration="2500">
        <i class="fa-solid ${icon} fa-lg"></i>
        <p class="d-inline text-capitalize">${g.type}</p>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <p class="m-0 p-0" style="font-size:0.95rem"><i class="fa-regular fa-user fa-sm me-1"></i>${
            g.name || "-"
          }</p>
          <button class="btn btn-outline-auto btn-sm shadow-sm rounded-4 py-0" style="font-size:0.75rem" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
            <i class="fa-solid fa-circle-info fa-sm me-1"></i>Info
          </button>
        </div>
        ${inner}
      </div>`;
        })
        .join("");
      el.innerHTML = html;
      el.classList.remove("d-none");
      return;
    }

    if (bindAttr) {
      if (bindAttr === "html") {
        el.innerHTML = String(v || "");
        const hasHtml = !!v;
        if (el.closest("#opening")) {
          const fb = document.getElementById("opening-fallback");
          if (fb) fb.style.display = hasHtml ? "none" : "";
        }
        if (hasHtml && el.id === "opening-html") normalizeOpeningTypography(el);
        if (!hasHtml && hideIfEmpty) el.classList.add("d-none");
        else el.classList.remove("d-none");
        return;
      }
      let out = String(v || "");
      const isSrcLike = /^(?:data-)?src$|^(?:data-)?href$/i.test(bindAttr);
      if (isSrcLike && out) {
        if (!out.startsWith("blob:")) out = resolveAsset(out);
        if (out.startsWith("blob:")) {
          try {
            const u = new URL(out);
            if (u.origin !== window.location.origin) {
              console.warn(
                "[bind]",
                bindAttr,
                "blob lintas origin, abaikan:",
                out
              );
              out = "";
            }
          } catch {}
        }
      }
      if (out) {
        el.setAttribute(bindAttr, out);
        el.classList.remove("d-none");
      } else if (hideIfEmpty) el.classList.add("d-none");
      return;
    }

    if (el.tagName === "IMG") {
      const out = v ? resolveAsset(String(v)) : "";
      if (out) {
        el.setAttribute("data-src", out);
        if (el.hasAttribute("src")) el.setAttribute("src", out);
        el.classList.remove("d-none");
      } else if (hideIfEmpty) el.classList.add("d-none");
      return;
    }

    el.textContent = String(v || "");
    if (!v && hideIfEmpty) el.classList.add("d-none");
    else el.classList.remove("d-none");
  });
}

function mapsEmbedSrc(addressOrQuery) {
  if (!addressOrQuery) return "";
  const q = encodeURIComponent(addressOrQuery);
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

function renderTimeline(items = []) {
  if (!Array.isArray(items) || !items.length) return "";
  return items
    .map((it, i) => {
      const num = i + 1;
      const title = (it.title || "").trim();
      const text = (it.text || it.description || "").trim();
      const when = (it.when || it.date || "").trim();
      return `
<div class="row">
  <div class="col-auto position-relative">
    <p class="position-relative d-flex justify-content-center align-items-center bg-theme-auto border border-secondary border-2 opacity-100 rounded-circle m-0 p-0 z-1" style="width:2rem;height:2rem">${num}</p>
    <hr class="position-absolute top-0 start-50 translate-middle-x border border-secondary h-100 z-0 opacity-100 m-0 rounded-4 shadow-none"/>
  </div>
  <div class="col mt-1 mb-3 ps-0">
    <p class="fw-bold mb-2">${title || "Tanpa judul"}</p>
    ${when ? `<p class="small text-secondary mb-1">${when}</p>` : ""}
    <p class="small mb-0">${text}</p>
  </div>
</div>`;
    })
    .join("");
}

function normalizeOpeningTypography(container) {
  const isArabic = (s) => /[\u0600-\u06FF]/.test(s || "");
  const blocks = Array.from(container.querySelectorAll("p,h1,h2,h3")).filter(
    (el) => (el.textContent || "").trim().length
  );
  let latinHeadlineDone = false,
    arabicHeadlineDone = false,
    firstBodyDone = false;
  blocks.forEach((el) => {
    const txt = (el.textContent || "").trim();
    el.className = el.className
      .split(" ")
      .filter(
        (c) =>
          ![
            "font-arabic",
            "font-esthetic",
            "py-4",
            "px-2",
            "m-0",
            "pb-4",
          ].includes(c)
      )
      .join(" ");
    el.style.fontSize = "";
    el.removeAttribute("dir");
    if (!arabicHeadlineDone && isArabic(txt)) {
      arabicHeadlineDone = true;
      el.classList.add("font-arabic", "py-4", "m-0");
      el.style.fontSize = "2rem";
      el.dir = "rtl";
      return;
    }
    if (!latinHeadlineDone && !isArabic(txt)) {
      latinHeadlineDone = true;
      el.classList.add("font-esthetic", "py-4", "m-0");
      el.style.fontSize = "1.8rem";
      return;
    }
    el.classList.add("m-0");
    if (!isArabic(txt)) {
      el.style.fontSize = "0.9rem";
      if (!firstBodyDone) {
        el.classList.add("pb-4", "px-2");
        firstBodyDone = true;
      }
    } else {
      el.classList.add("font-arabic");
      el.style.fontSize = "1.2rem";
      el.dir = "rtl";
    }
  });
}

const takeGalleryUrls = (event, max = 4) => {
  const raw = event?.content?.gallery || [];
  const urls = raw
    .map((it) => (typeof it === "string" ? it : it?.url))
    .filter(Boolean);
  return urls.slice(0, max).map(resolveAsset);
};

const applyEventToDom = (event, guest) => {
  if (!event) return;
  CURRENT_EVENT = event;
  CURRENT_GUEST = guest || null;

  if (el.guestName) {
    const prefix =
      el.guestName.dataset.message || "Kepada Yth Bapak/Ibu/Saudara/i";
    const displayName = (
      guest?.name ||
      event?.recipient_name ||
      "Tamu Undangan"
    ).trim();
    const groupName = (guest?.group_name || "").trim();
    const showGroup =
      groupName && groupName.toLowerCase() !== displayName.toLowerCase()
        ? groupName
        : "";
    el.guestName.innerHTML = `
      <p class="m-0">${prefix}</p>
      <h3 class="font-esthetic my-2" style="font-size: 1.5rem;">${displayName}</h3>
      ${showGroup ? `<p class="m-0 small">${showGroup}</p>` : ""}`.trim();
    if (el.formName && (guest?.name || event?.recipient_name)) {
      el.formName.value = guest?.name || event?.recipient_name || "";
    }
  }

  const dateText = fmtDate(event.start_at);
  const timeText = fmtTimeRange(event.start_at, event.end_at);
  setTextAll(el.eventDate, dateText);
  setTextAll(el.eventTime, timeText);
  el.eventTime?.forEach((node) => {
    if (!node) return;
    if (!timeText) {
      node.classList.add("d-none");
    } else {
      node.classList.remove("d-none");
    }
  });

  if (el.mapsLink) {
    if (event.map_url) {
      el.mapsLink.href = event.map_url;
    } else {
      const query = [event.location_name, event.address]
        .filter(Boolean)
        .join(", ");
      if (query) {
        el.mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          query
        )}`;
      }
    }
  }

  const hero = resolveAsset(event.content?.hero_image);
  let sliderUrls = takeGalleryUrls(event, 4);
  if (!sliderUrls.length && hero) sliderUrls = [hero];
  buildDesktopSlider(sliderUrls);

  if (el.mobileCircle) {
    if (hero) {
      el.mobileCircle.src = hero;
      el.mobileCircle.classList.remove("d-none");
    } else {
      el.mobileCircle.classList.add("d-none");
    }
  }

  if (el.mobileBackdrop) {
    const bg = sliderUrls[0] || hero || "";
    if (bg) {
      el.mobileBackdrop.src = bg;
      el.mobileBackdrop.classList.remove("d-none");
    } else {
      el.mobileBackdrop.classList.add("d-none");
    }
  }

  const storyVideo = resolveAsset(event.content?.story?.video);
  if (storyVideo && el.storyBox) {
    el.storyBox.dataset.src = storyVideo;
  } else {
    el.storyBtn?.classList.add("d-none");
  }

  if (event.music?.file) {
    BODY.dataset.audio = resolveAsset(event.music.file);
  } else if (BODY.dataset.audio) {
    BODY.dataset.audio = "";
  }

  if (!BODY.dataset.time && event.start_at) {
    BODY.dataset.time = event.start_at.replace("T", " ").substring(0, 19);
  }

  startCountdown(event.start_at);
  if (event.title) document.title = event.title;

  if (el.loading) el.loading.style.opacity = "0";
  if (el.welcome) el.welcome.style.opacity = "1";
  el.root?.classList.remove("opacity-0");

  setBindings(event, guest);
  forceReplaceStoryVideo();

  const btn = document.getElementById("btn-story");
  const vid = document.getElementById("love-video");
  if (btn && vid) {
    const hasVideo = !!vid.getAttribute("src");
    btn.classList.toggle("d-none", !hasVideo);
    btn.onclick = () => {
      if (!vid.src) return;
      vid.classList.remove("d-none");
      try {
        vid.play().catch(() => {});
      } catch {}
      vid.scrollIntoView({ behavior: "smooth", block: "center" });
    };
  }

  if (event?.slug) COMMENT_ADAPTER.wireComments(event.slug);
};

const buildDesktopSlider = (urls) => {
  if (!el.desktopSlides) return;
  el.desktopSlides.innerHTML = "";
  urls.forEach((u) => {
    const wrap = document.createElement("div");
    wrap.className = "position-absolute h-100 w-100 slide-desktop";
    wrap.style.opacity = "0";
    const img = document.createElement("img");
    img.className = "bg-cover-home";
    img.alt = "bg";
    img.src = u;
    img.style.maskImage = "none";
    img.style.opacity = "30%";
    wrap.appendChild(img);
    el.desktopSlides.appendChild(wrap);
  });
  const first = el.desktopSlides.querySelector(".slide-desktop");
  if (first) first.style.opacity = "1";
};

const pickTime = (row) => {
  const t =
    row?.updated_at ||
    row?.updatedAt ||
    row?.created_at ||
    row?.createdAt ||
    new Date().toISOString();
  console.log("[pickTime]", {
    id: row?.id,
    created_at: row?.created_at,
    updated_at: row?.updated_at,
    chosen: t,
  });
  return t;
};

// ===== COMMENT ADAPTER =====
const COMMENT_ADAPTER = (() => {
  const stateC = { next: 0, total: 0, slug: "", loading: false, per: 10 };

  const toNumber = (value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const pickLatestDate = (fields) => {
    let latest = null;
    fields.forEach((raw) => {
      const date = toDate(raw);
      if (!date) return;
      if (!latest || date.getTime() > latest.date.getTime()) {
        latest = { raw, date };
      }
    });
    return latest;
  };

  const resolveTimestamp = (item) => {
    const latest = pickLatestDate([
      item?.updated_at,
      item?.updatedAt,
      item?.modified_at,
      item?.modifiedAt,
      item?.edited_at,
      item?.editedAt,
      item?.created_at,
      item?.createdAt,
      item?.created_on,
      item?.createdOn,
    ]) || { raw: new Date().toISOString(), date: new Date() };
    return latest.raw;
  };

  const extractLikeCount = (item) => {
    if (!item) return 0;
    if (item.likes_count !== undefined) {
      return toNumber(item.likes_count);
    }
    if (item.like_count !== undefined) {
      return toNumber(item.like_count);
    }
    if (item.likesCount !== undefined) {
      return toNumber(item.likesCount);
    }
    if (item.total_likes !== undefined) {
      return toNumber(item.total_likes);
    }
    const rawLikes = item.likes;
    if (typeof rawLikes === "number" || typeof rawLikes === "string") {
      return toNumber(rawLikes);
    }
    if (Array.isArray(rawLikes)) {
      return rawLikes.length;
    }
    if (rawLikes && typeof rawLikes === "object") {
      if (typeof rawLikes.count === "number") return rawLikes.count;
      if (typeof rawLikes.total === "number") return rawLikes.total;
      if (Array.isArray(rawLikes.data)) return rawLikes.data.length;
      if (Array.isArray(rawLikes.items)) return rawLikes.items.length;
      if (Array.isArray(rawLikes.lists)) return rawLikes.lists.length;
      if (typeof rawLikes.value === "number") return rawLikes.value;
    }

    const metaSources = [
      item.meta,
      item.stats,
      item.summary,
      item.metrics,
      item.counters,
    ].filter((obj) => obj && typeof obj === "object");

    for (const src of metaSources) {
      if (src.likes_count !== undefined) return toNumber(src.likes_count);
      if (src.like_count !== undefined) return toNumber(src.like_count);
      if (src.likes !== undefined) {
        if (typeof src.likes === "number" || typeof src.likes === "string") {
          return toNumber(src.likes);
        }
        if (typeof src.likes === "object") {
          if (typeof src.likes.count === "number") return src.likes.count;
          if (Array.isArray(src.likes.data)) return src.likes.data.length;
        }
      }
    }
    return 0;
  };

  const extractLiked = (item) => {
    if (!item) return false;
    if (item.liked !== undefined) return Boolean(item.liked);
    if (item.is_liked !== undefined) return Boolean(item.is_liked);
    if (item.isLiked !== undefined) return Boolean(item.isLiked);
    if (item.like !== undefined) return Boolean(item.like);
    if (item.like_uuid !== undefined) return Boolean(item.like_uuid);
    if (Array.isArray(item.likes)) {
      return item.likes.some((l) => Boolean(l?.is_self || l?.liked));
    }
    if (item.likes && typeof item.likes === "object") {
      if (typeof item.likes.liked === "boolean") return item.likes.liked;
      if (typeof item.likes.is_liked === "boolean") return item.likes.is_liked;
      if (Array.isArray(item.likes.data)) {
        return item.likes.data.some((l) => Boolean(l?.is_self || l?.liked));
      }
    }
    const metaSources = [
      item.meta,
      item.stats,
      item.summary,
      item.metrics,
      item.counters,
    ].filter((obj) => obj && typeof obj === "object");
    for (const src of metaSources) {
      if (typeof src.liked === "boolean") return src.liked;
      if (typeof src.is_liked === "boolean") return src.is_liked;
      if (Array.isArray(src.likes)) {
        if (src.likes.some((l) => Boolean(l?.is_self || l?.liked))) return true;
      }
      if (src.likes && typeof src.likes === "object") {
        if (typeof src.likes.liked === "boolean") return src.likes.liked;
        if (Array.isArray(src.likes.data)) {
          if (src.likes.data.some((l) => Boolean(l?.is_self || l?.liked))) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const extractReplies = (item) => {
    const raw =
      item?.replies ??
      item?.reply ??
      item?.comments ??
      item?.children ??
      item?.responses;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") {
      const vals = Object.values(raw).filter((v) => typeof v === "object");
      if (vals.length) return vals;
    }
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.lists)) return raw.lists;
    if (Array.isArray(raw?.list)) return raw.list;
    return [];
  };

  const timeAgo = (iso) => {
    const d = toDate(iso);
    if (!d) return "";
    const now = Date.now();
    let diff = Math.floor((now - d.getTime()) / 1000);
    if (!Number.isFinite(diff)) return "";
    if (diff <= 0) return "baru saja";
    if (diff < 60) return `${diff} detik yang lalu`;
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari yang lalu`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} bulan yang lalu`;
    const years = Math.floor(months / 12);
    return `${years} tahun yang lalu`;
  };

  const renderCommentCard = (item) => {
    const idRaw =
      item.id ??
      item.rsvp_id ??
      item.uuid ??
      item.comment_id ??
      item._id ??
      item.slug ??
      0;
    const idAttr = String(idRaw);
    const name = (item.name || item.guest?.name || "Tamu").trim();
    const messageSource =
      item.message ?? item.comment ?? item.body ?? item.content ?? "";
    const msg = String(messageSource).trim().replace(/\n/g, "<br>");
    const when = pickTime(item);
    const likes = extractLikeCount(item);
    const liked = extractLiked(item);
    const replies = extractReplies(item);

    // ini yang baru
    const isPresent = Number(item.guests_count || 0) > 0;
    const presenceIcon = isPresent
      ? '<i class="fa-solid fa-circle-check text-success ms-1 small"></i>'
      : '<i class="fa-solid fa-circle-xmark text-danger ms-1 small"></i>';

    const repliesHtml = replies
      .map((r) => {
        const rId = r.id ?? r.rsvp_reply_id;
        const rName = (r.name || r.guest?.name || "Tamu").trim();
        const rSource = r.message ?? r.comment ?? r.body ?? r.content ?? "";
        const rMsg = String(rSource).trim().replace(/\n/g, "<br>");
        const rWhen = pickTime(r);
        return `
      <div class="border rounded-3 p-2 mb-2 bg-light reply-level-1" data-reply-id="${rId}">
        <div class="d-flex justify-content-between mb-1">
          <small class="fw-bold">${rName}</small>
          <small class="text-muted" style="font-size:.75rem">${timeAgo(
            rWhen
          )}</small>
        </div>
        <p class="m-0 small" data-reply-text>${rMsg}</p>
        <div class="d-flex gap-2 mt-2 align-items-center">
          <button class="btn btn-outline-auto btn-sm rounded-4 btn-reply-child" data-id="${rId}">
            Reply
          </button>
          <button class="btn btn-outline-auto btn-sm rounded-4 btn-edit-reply" data-id="${rId}">
            Edit
          </button>
          <button class="btn btn-outline-auto btn-sm rounded-4 btn-del-reply" data-id="${rId}">
            Delete
          </button>
        </div>
      </div>
    `;
      })
      .join("");

    return `
    <div class="card shadow-sm rounded-4 p-3 mb-3" data-comment-id="${idAttr}">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <h6 class="m-0">${name} ${presenceIcon}</h6>
        <small class="text-muted">${timeAgo(when)}</small>
      </div>
      <p class="m-0">${msg || "-"}</p>
      <div class="replies-container mt-2 mb-2" data-replies-${idAttr}>${repliesHtml}</div>
      <div class="d-flex gap-2 mt-2 align-items-center">
        <button class="btn btn-outline-auto btn-sm rounded-4 btn-reply" data-id="${idAttr}">
          <i class="fa-solid fa-reply me-1"></i>Reply${
            replies.length > 0 ? ` (${replies.length})` : ""
          }
        </button>
        <span class="ms-auto small text-muted like-count">${likes}</span>
        <button class="btn btn-outline-auto btn-sm rounded-4 btn-like ${
          liked ? "active text-danger" : ""
        }" data-id="${idAttr}">
          <i class="fa-${liked ? "solid" : "regular"} fa-heart"></i>
        </button>
      </div>
      <div class="reply-form mt-2 d-none" data-reply-form-${idAttr}>
        <div class="input-group input-group-sm">
          <input type="text" class="form-control rounded-start-4" placeholder="Nama (opsional)" data-reply-name />
          <input type="text" class="form-control" placeholder="Tulis balasan…" data-reply-text />
          <button class="btn btn-primary rounded-end-4 btn-send-reply" data-id="${idAttr}">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>`;
  };

  const renderComments = (list) => {
    console.log("[renderComments raw]", list);
    const box = document.getElementById("comments");
    if (!box) return;
    if (!list.length) {
      box.innerHTML = `<div class="text-center p-4 bg-theme-auto rounded-4 shadow">Belum ada ucapan.</div>`;
      return;
    }
    box.innerHTML = list.map(renderCommentCard).join("");
  };

  const unwrapList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.lists)) return payload.lists;
    if (Array.isArray(payload?.list)) return payload.list;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const ensureNumber = (value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const resolveId = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
    return String(value);
  };

  const fetchComments = async (reset = false) => {
    if (stateC.loading) return;
    stateC.loading = true;
    try {
      if (reset) stateC.next = 0;
      const tokenPart = TOKEN
        ? `&invite_token=${encodeURIComponent(TOKEN)}`
        : "";
      let url = `/rsvps?event_slug=${encodeURIComponent(stateC.slug)}&per=${
        stateC.per
      }&next=${stateC.next}${tokenPart}`;
      console.log("[fetchComments] base url:", url);
      let res;
      try {
        res = await API.get(url);
      } catch (err) {
        console.warn("[fetchComments] primary failed, trying fallback", err);
        url = `/events/${encodeURIComponent(stateC.slug)}/rsvps?per=${
          stateC.per
        }&next=${stateC.next}${tokenPart}`;
        console.log("[fetchComments] fallback url:", url);
        res = await API.get(url);
      }
      console.log("[fetchComments] response raw:", res);

      const payload = res?.data ?? res ?? {};
      const listsSource =
        payload.lists ??
        payload.data ??
        payload.results ??
        payload.items ??
        payload.list ??
        payload;

      const lists = unwrapList(listsSource);
      renderComments(lists);

      const count =
        ensureNumber(payload.count) ||
        ensureNumber(listsSource?.count) ||
        ensureNumber(listsSource?.total) ||
        lists.length;

      const nextRaw =
        payload.next ??
        payload.next_cursor ??
        payload.nextPage ??
        listsSource?.next ??
        listsSource?.next_cursor ??
        0;

      stateC.total = ensureNumber(count);
      stateC.next = ensureNumber(nextRaw);

      const pageNow = Math.floor((stateC.next || 0) / stateC.per) + 1;
      const totalPg = Math.max(1, Math.ceil(stateC.total / stateC.per));
      const pageEl = document.getElementById("c-page");
      const prevBtn = document.getElementById("c-prev");
      const nextBtn = document.getElementById("c-next");
      if (pageEl) pageEl.textContent = `${pageNow}/${totalPg}`;
      if (prevBtn) prevBtn.disabled = pageNow <= 1;
      if (nextBtn) nextBtn.disabled = pageNow >= totalPg;
    } catch (e) {
      console.error("[comments] fetch error:", e);
    } finally {
      stateC.loading = false;
    }
  };

  const attachHandlers = () => {
    const box = document.getElementById("comments");
    if (!box) return;
    const newBox = box.cloneNode(true);
    box.parentNode.replaceChild(newBox, box);

    newBox.addEventListener("click", async (e) => {
      const likeBtn = e.target.closest(".btn-like");
      if (likeBtn) {
        const idRaw = likeBtn.dataset.id;
        const idResolved = resolveId(idRaw);
        if (!idResolved) return;
        try {
          likeBtn.disabled = true;
          const r = await API.post(`/rsvps/${idResolved}/like`, {});
          console.log("[like response]", r);
          const newCount = r?.likes_count ?? r?.data?.likes_count ?? 0;
          const isLiked = r?.liked ?? r?.data?.liked ?? false;
          const card = likeBtn.closest("[data-comment-id]");
          const countEl = card.querySelector(".like-count");
          if (countEl) countEl.textContent = newCount;
          const icon = likeBtn.querySelector("i");
          if (isLiked) {
            likeBtn.classList.add("active", "text-danger");
            if (icon) icon.className = "fa-solid fa-heart";
          } else {
            likeBtn.classList.remove("active", "text-danger");
            if (icon) icon.className = "fa-regular fa-heart";
          }
        } catch (err) {
          console.error("[Like error]", err);
        } finally {
          likeBtn.disabled = false;
        }
        return;
      }

      const replyBtn = e.target.closest(".btn-reply");
      if (replyBtn) {
        const id = replyBtn.dataset.id;
        const form = newBox.querySelector(`[data-reply-form-${id}]`);
        if (form) {
          form.classList.toggle("d-none");
          const nameInput = form.querySelector("[data-reply-name]");
          const textInput = form.querySelector("[data-reply-text]");
          if (!form.classList.contains("d-none")) {
            // isi otomatis nama dari token
            if (TOKEN && nameInput && !nameInput.value) {
              nameInput.value =
                CURRENT_GUEST?.name || CURRENT_EVENT?.recipient_name || "Tamu";
            }
            if (textInput) textInput.focus();
          }
        }
        return;
      }

      const sendReplyBtn = e.target.closest(".btn-send-reply");
      if (sendReplyBtn) {
        const idRaw = sendReplyBtn.dataset.id;
        const idResolved = resolveId(idRaw);
        if (!idResolved) return;

        // 1. cari form terdekat dulu
        const formScope =
          sendReplyBtn.closest(".reply-form, [data-comment-id]") || newBox;

        // 2. ambil input dari scope terdekat
        const nameEl =
          formScope.querySelector("[data-reply-name]") ||
          newBox.querySelector(
            `[data-comment-id="${idRaw}"] [data-reply-name]`
          );
        const textEl =
          formScope.querySelector("[data-reply-text]") ||
          newBox.querySelector(
            `[data-comment-id="${idRaw}"] [data-reply-text]`
          );

        const name = (nameEl?.value || "Tamu").trim();
        const msg = (textEl?.value || "").trim();

        console.log("[reply send debug]", {
          idResolved,
          name,
          msg,
          formScope,
        });

        if (!msg) {
          alert("Balasan tidak boleh kosong");
          return;
        }

        try {
          sendReplyBtn.disabled = true;
          await API.post(`/rsvps/${idResolved}/replies`, {
            name,
            message: msg,
            rsvp_id: idResolved,
          });

          if (nameEl) nameEl.value = "";
          if (textEl) textEl.value = "";

          // tutup form yang barusan dipakai
          const form = newBox.querySelector(`[data-reply-form-${idRaw}]`);
          if (form) form.classList.add("d-none");

          await COMMENT_ADAPTER.fetchComments(false);
        } catch (err) {
          console.error("[Reply error]", err);
          alert("Gagal mengirim balasan");
        } finally {
          sendReplyBtn.disabled = false;
        }
        return;
      }

      const replyChildBtn = e.target.closest(".btn-reply-child");
      if (replyChildBtn) {
        const parentCard = e.target.closest("[data-comment-id]");
        if (parentCard) {
          const parentId = parentCard.dataset.commentId;
          const form = parentCard.querySelector(
            `[data-reply-form-${parentId}]`
          );
          if (form) {
            form.classList.remove("d-none");
            const nameInput = form.querySelector("[data-reply-name]");
            const textInput = form.querySelector("[data-reply-text]");
            if (textInput) textInput.focus();
            // opsional: isi nama
            if (TOKEN && nameInput && !nameInput.value) {
              nameInput.value =
                CURRENT_GUEST?.name || CURRENT_EVENT?.recipient_name || "Tamu";
            }
          }
        }
        return;
      }

      // edit reply
      // edit reply (inline)
      const editBtn = e.target.closest(".btn-edit-reply");
      if (editBtn) {
        const id = editBtn.dataset.id;
        const wrap = editBtn.closest("[data-reply-id]");
        if (!wrap) return;
        const textP = wrap.querySelector("[data-reply-text]");
        if (!textP) return;

        // kalau sudah mode edit, jangan dobel
        if (wrap.querySelector("[data-reply-editing]")) return;

        const oldHtml = textP.innerHTML;
        const oldText = oldHtml.replace(/<br\s*\/?>/gi, "\n");

        // bikin form kecil
        const formDiv = document.createElement("div");
        formDiv.setAttribute("data-reply-editing", "1");
        formDiv.className = "mt-2";
        formDiv.innerHTML = `
    <div class="input-group input-group-sm">
      <textarea class="form-control" rows="2" data-reply-edit-text>${oldText}</textarea>
      <button class="btn btn-primary" type="button" data-reply-edit-save>Simpan</button>
      <button class="btn btn-secondary" type="button" data-reply-edit-cancel>Batal</button>
    </div>
  `;
        wrap.appendChild(formDiv);

        const saveBtn = formDiv.querySelector("[data-reply-edit-save]");
        const cancelBtn = formDiv.querySelector("[data-reply-edit-cancel]");
        const ta = formDiv.querySelector("[data-reply-edit-text]");

        cancelBtn.onclick = () => {
          formDiv.remove();
        };

        saveBtn.onclick = async () => {
          const newText = (ta.value || "").trim();
          if (!newText) {
            alert("Isi balasan.");
            return;
          }
          try {
            saveBtn.disabled = true;
            await API.post(`/rsvp-replies/${id}`, {
              _method: "PATCH",
              message: newText,
            });
            // ubah tampilan tanpa reload semua
            textP.innerHTML = newText.replace(/\n/g, "<br>");
            formDiv.remove();
          } catch (err) {
            console.error("[edit reply]", err);
            alert("Gagal edit balasan");
            saveBtn.disabled = false;
          }
        };

        return;
      }

      // delete reply
      const delBtn = e.target.closest(".btn-del-reply");
      if (delBtn) {
        const id = delBtn.dataset.id;
        if (!confirm("Hapus balasan ini?")) return;
        try {
          await API.post(`/rsvp-replies/${id}`, { _method: "DELETE" });
          await COMMENT_ADAPTER.fetchComments(false);
        } catch (err) {
          console.error("[del reply]", err);
          alert("Gagal hapus balasan");
        }
        return;
      }
    });
  };

  const wireComments = (slug) => {
    stateC.slug = slug;
    const prevBtn = document.getElementById("c-prev");
    const nextBtn = document.getElementById("c-next");
    if (prevBtn) {
      prevBtn.onclick = () => {
        stateC.next = Math.max(0, stateC.next - stateC.per);
        fetchComments(false);
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        stateC.next = stateC.next + stateC.per;
        fetchComments(false);
      };
    }
    fetchComments(true);
    attachHandlers();
  };

  return { wireComments, fetchComments, attachHandlers };
})();

const ensureBaseConfigured = () => Boolean((BODY?.dataset?.url || "").trim());

const loadEventData = async () => {
  if (!ensureBaseConfigured()) {
    console.warn("data-url kosong; lewati integrasi API.");
    return;
  }
  let event = null;
  let guest = null;
  let tokenInvalid = false;

  if (TOKEN) {
    try {
      const res = await API.get(`/invites/${encodeURIComponent(TOKEN)}`);
      const payload = res?.data ?? res ?? {};
      event = res?.event ?? null;
      guest = res?.guest ?? null;
    } catch (err) {
      console.error(err);
      if (err?.code === "VALIDATION_ERROR" && err?.fields?.token) {
        tokenInvalid = true;
        alert("Token undangan tidak valid.");
      } else {
        alertError(err);
        return;
      }
    }
  }

  if (!event) {
    const slug = (EVENT_SLUG || "").trim();
    if (!slug) {
      console.warn(
        "data-event-slug kosong dan token tidak valid, tidak dapat memuat event."
      );
      return;
    }
    try {
      const query =
        TOKEN && !tokenInvalid
          ? `?invite_token=${encodeURIComponent(TOKEN)}`
          : "";
      event = await API.get(`/events/${encodeURIComponent(slug)}${query}`);
      if (!guest) guest = event?.guest ?? null;
    } catch (err) {
      console.error(err);
      alertError(err);
      return;
    }
  }
  applyEventToDom(event, guest);
};

const sendRSVP = async (button) => {
  if (!button) return;
  if (!CURRENT_EVENT) {
    alert("Data acara belum siap.");
    return;
  }
  const presenceRaw = el.formPresence?.value || "0";
  const guestsCount = Number(presenceRaw) === 1 ? 1 : 0;
  const message = el.formComment?.value?.trim() || "";
  const nameValue = el.formName?.value?.trim() || "";

  const payload = { guests_count: guestsCount, message };
  const eventId = Number(CURRENT_EVENT.id);
  if (!Number.isNaN(eventId) && eventId > 0) payload.event_id = eventId;
  if (CURRENT_EVENT.slug) payload.event_slug = CURRENT_EVENT.slug;

  if (TOKEN) {
    payload.token = TOKEN;
  } else {
    if (!nameValue) {
      alert("Nama wajib diisi.");
      return;
    }
    payload.name = nameValue;
  }

  try {
    button.disabled = true;
    await API.post("/rsvps", payload);
    if (el.formComment) el.formComment.value = "";
    await COMMENT_ADAPTER.fetchComments(true);
  } catch (err) {
    console.error(err);
    if (err?.code === "VALIDATION_ERROR" && err?.fields?.token) {
      alert("Token undangan tidak valid.");
    } else {
      alert(err?.message || "Gagal mengirim.");
    }
  } finally {
    button.disabled = false;
  }
};

window.addEventListener("DOMContentLoaded", () => {
  assignElements();
  loadEventData().catch((err) => {
    console.error(err);
    alertError(err);
  });
  // if (el.sendBtn) {
  //   el.sendBtn.removeAttribute("onclick");
  //   el.sendBtn.onclick = () => sendRSVP(el.sendBtn);
  // }
  if (el.sendBtn) {
    el.sendBtn.onclick = () => sendRSVP(el.sendBtn);
  }
});

// Auto-detect environment
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  // Development: gunakan IP langsung
  document.body.dataset.url = "http://10.133.21.24:8002/api/v1";
} else {
  // Production: gunakan relative path (akan di-proxy Caddy)
  document.body.dataset.url = "/api/v1";
}

console.log("API URL:", document.body.dataset.url);

// guest-local.js - Auto-detect environment
(function () {
  const isDev =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.port === "8080";

  console.log("Environment:", isDev ? "Development" : "Production");
  console.log("API URL:", document.body.dataset.url);

  if (isDev) {
    // Development: override ke backend langsung
    console.log("Development mode: using direct backend URL");
    document.body.dataset.url = "http://10.133.21.24:8002/api/v1";
  } else {
    // Production: gunakan relative path (sudah di-set di index.html)
    console.log("Production mode: using relative API path");
  }
})();
