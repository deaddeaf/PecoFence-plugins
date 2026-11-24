const INTERVAL = 10 * 60 * 1000;
const HOST_INTERVAL = 61_000;
const MANUAL_COVER_INTERVAL = 3000;
const STORE_RETRY = 5 * 60 * 1000;
const SLIDE_INTERVAL = 4500;
const STEAM = "https://store.steampowered.com";
const STEAM_PROGRAM = "C:\\Program Files (x86)\\Steam\\steam.exe";
const CDN = "https://shared.akamai.steamstatic.com";
const GAMES_BY_ID = new Map(gameCatalog.map((game) => [game.id, game]));
const KEY = "random-steam-game:" + (pf.fence?.id || "default");
const DISCOVERY_KEY = KEY + ":discovery";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const ui = {
  gallery: document.querySelector(".gallery"),
  image: document.querySelector("figure"),
  status: document.getElementById("gallery-status"),
  tags: document.querySelector(".tags"),
  title: document.querySelector(".game-title"),
  description: document.querySelector(".description"),
  nav: document.querySelector("nav"),
  steamdb: document.querySelector(".steamdb"),
  previous: document.getElementById("previous"),
  next: document.getElementById("next"),
  indicators: document.getElementById("indicators"),
  nextGame: document.getElementById("next-game"),
  steamNotice: document.querySelector(".steam-notice"),
};
const labels = {
  en: {
    gallery: "Game screenshots", genres: "Genres", links: "Game links", steam: "Steam store page",
    steamdb: "SteamDB statistics", previous: "Previous frame", next: "Next frame", frames: "Gallery frames",
    frame: "Frame", screenshot: "Screenshot", nextGame: "Another game",
    loading: "Loading screenshots…", offline: "Screenshots are unavailable", cover: "Cover art",
    steamDisabled: "To open the Steam client, turn on Windows system functions for plugins in PecoFence’s Tools settings.",
  },
  ru: {
    gallery: "Скриншоты игры", genres: "Жанры", links: "Ссылки игры", steam: "Страница в Steam",
    steamdb: "Статистика на SteamDB", previous: "Предыдущий кадр", next: "Следующий кадр", frames: "Кадры галереи",
    frame: "Кадр", screenshot: "Скриншот", nextGame: "Другая игра",
    loading: "Загружаю скриншоты…", offline: "Скриншоты недоступны", cover: "Обложка",
    steamDisabled: "Для открытия в Steam включи «Разрешить плагинам системные функции Windows» в разделе «Инструменты» PecoFence.",
  },
};

let lang = pf.lang === "ru" ? "ru" : "en";
let selection = readSelection();
let game = selection.game;
const discovery = readDiscovery(DISCOVERY_KEY);
let catalogWarmup = discovery.games.some((entry) => entry.reviews !== undefined) ? 0 : 2;
let visible = true;
let rotating;
let galleryTimer;
let imageTimer;
let serial = 0;
let storeBusy = false;
let storeTimer;
let recoveryPage = false;
let detailLang;
let detailRetryAt = 0;
let localizedDetails;
let galleryReady = false;
let apiNext = 0;
let imageNext = 0;
let lastImageStart = -Infinity;
let manualCover = false;
let shots = [];
let imageRequest;
let active = -1;
let displayed;
let transition;
let requested = -1;
let steamRunning = false;
let steamNoticeTimer;
let browseBusy = false;
let browseTimer;
let browseLast = -Infinity;
let browseBlocked = 0;
let priorityDetails = false;
const prepared = new Map();
const browseMisses = new Set();

function readSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    const entry = GAMES_BY_ID.get(saved?.id) || discoveryGame(saved?.game);
    if (entry?.id === saved?.id && Number.isFinite(saved?.nextAt)) return { game: entry, nextAt: saved.nextAt };
  } catch { /* A new selection is made if storage is unavailable. */ }
  return { game: null, nextAt: 0 };
}

function saveSelection() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: game.id, game: discoveryGame(game), nextAt: selection.nextAt }));
  } catch { /* This fence can still rotate. */ }
}

function saveDiscovery() {
  try { localStorage.setItem(DISCOVERY_KEY, JSON.stringify(discovery)); } catch { /* The pool is usable in memory. */ }
}

function pickGame(manual = false) {
  const unseen = (entry) => entry.id !== game?.id && !discovery.recent.includes(entry.id);
  const live = discovery.games.filter(unseen);
  const next = live.length
    ? weightedGame(live, (entry) => prepared.has(detailKey(entry.id, lang)))
    : randomGame(gameCatalog.filter(unseen));
  selection.nextAt = Date.now() + INTERVAL;
  if (next) {
    if (game && !discovery.recent.includes(game.id)) discovery.recent.push(game.id);
    discovery.recent.push(next.id);
    discovery.recent = discovery.recent.slice(-RECENT_LIMIT);
    discovery.games = live.filter((entry) => entry.id !== next.id);
    if (live.length && discovery.games.length < 7) {
      discovery.nextAt = Math.min(discovery.nextAt, Date.now() + HOST_INTERVAL);
    }
    selection.game = GAMES_BY_ID.get(next.id) || next;
    changeGame(manual);
  }
  saveSelection();
  saveDiscovery();
  scheduleStore();
}

function scheduleRotation() {
  clearTimeout(rotating);
  if (!visible) return;
  const now = Date.now();
  if (!game || selection.nextAt <= now || selection.nextAt - now > INTERVAL) pickGame();
  rotating = setTimeout(scheduleRotation, Math.max(1, selection.nextAt - Date.now()));
}

function chooseNextGame() {
  pickGame(true);
  scheduleRotation();
}

function setLabel(element, value) { element.setAttribute("aria-label", value); }

function fitTags() {
  const items = [...ui.tags.children];
  const last = items[3];
  if (!last) return;
  last.hidden = false;
  const gap = parseFloat(getComputedStyle(ui.tags).columnGap) || 0;
  last.hidden = items.reduce((sum, item) => sum + item.offsetWidth, 3 * gap) > ui.tags.clientWidth;
}

function drawText() {
  if (!game) return;
  const t = labels[lang];
  document.documentElement.lang = lang;
  ui.title.textContent = game.name;
  ui.title.href = STEAM + "/app/" + game.id + "/";
  ui.title.title = t.steam;
  const details = localizedDetails?.lang === lang ? localizedDetails : game[lang];
  ui.description.textContent = details?.description || "";
  ui.tags.classList.toggle("sennaar-tags", lang === "ru" && game.id === 1931770);
  ui.tags.replaceChildren(...(details?.tags || []).map((tag) => {
    const item = document.createElement("li");
    item.textContent = tag;
    return item;
  }));
  fitTags();
  ui.steamdb.querySelector("span").textContent = t.steamdb;
  ui.steamdb.href = "https://steamdb.info/app/" + game.id + "/";
  ui.nextGame.title = t.nextGame;
  setLabel(ui.gallery, t.gallery);
  setLabel(ui.tags, t.genres);
  setLabel(ui.nav, t.links);
  setLabel(ui.previous, t.previous);
  setLabel(ui.next, t.next);
  setLabel(ui.indicators, t.frames);
  setLabel(ui.nextGame, t.nextGame);
  if (displayed) displayed.alt = altText(active);
  drawControls();
}

function altText(index) {
  return labels[lang][shots[index]?.cover ? "cover" : "screenshot"] + " · " + game.name;
}

function drawControls() {
  const count = shots.filter((shot) => !shot.failed).length;
  ui.previous.hidden = count < 2;
  ui.next.hidden = count < 2;
  if (ui.indicators.childElementCount !== shots.length) {
    ui.indicators.replaceChildren(...shots.map((_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.addEventListener("click", () => chooseFrame(index));
      return button;
    }));
  }
  [...ui.indicators.children].forEach((button, index) => {
    button.hidden = count < 2 || shots[index].failed;
    setLabel(button, labels[lang].frame + " " + (index + 1));
    button.setAttribute("aria-pressed", String(index === active));
  });
  ui.status.hidden = active !== -1;
  const available = shots.some((shot) => !shot.failed);
  ui.status.textContent = labels[lang][available ? "loading" : "offline"];
}

function artworkUrl(value, id) {
  if (typeof value !== "string" || value.length > 1024) return "";
  try {
    const address = new URL(value);
    if (address.origin !== CDN || address.username || address.password
      || !address.pathname.startsWith("/store_item_assets/steam/apps/" + id + "/")
      || !/\.(jpg|jpeg|png|webp)$/i.test(address.pathname)) return "";
    address.hash = "";
    return address.href;
  } catch { return ""; }
}

function retryTime(headers) {
  const value = headers instanceof Headers ? headers.get("retry-after") : headers?.["retry-after"];
  if (!value) return 0;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Date.now() + Math.max(0, seconds) * 1000 : Date.parse(value) || 0;
}

function installShots(urls) {
  const existing = new Map(shots.map((shot) => [shot.url, shot]));
  shots = urls.map(({ url, cover }) => existing.get(url) || { url, cover, blob: "", failed: false });
  drawControls();
  scheduleImage();
}

function detailKey(id, locale) {
  return locale + ":" + id;
}

function applyDetails(details, locale) {
  if (!game[locale]) localizedDetails = { lang: locale, description: details.description, tags: details.tags };
  detailLang = locale;
  drawText();
  if (galleryReady) return;
  const interim = shots[0];
  const keepInterim = interim && !interim.failed && (interim.blob || imageRequest);
  const cover = (keepInterim && interim.url) || details.cover || (!interim?.failed && interim?.url);
  const urls = [...new Set(details.screenshots)].filter((url) => url !== cover).slice(0, cover ? 4 : 5);
  galleryReady = true;
  installShots(cover ? [{ url: cover, cover: true }, ...urls.map((url) => ({ url }))]
    : urls.length ? urls.map((url) => ({ url })) : shots.length ? shots : [defaultCover(game.id)]);
}

function needsDetails() {
  return game && (!galleryReady || !game[lang] && detailLang !== lang);
}

function browseTargets() {
  const activeKey = game && detailKey(game.id, lang);
  const pending = needsDetails() && !browseMisses.has(activeKey) ? [game] : [];
  if (!discovery.games.length && !discovery.nextAt && game?.[lang] && !priorityDetails) return [];
  const ready = discovery.games.filter((entry) => prepared.has(detailKey(entry.id, lang)));
  const available = discovery.games.filter((entry) => {
    const key = detailKey(entry.id, lang);
    return entry.id !== game?.id && !prepared.has(key) && !browseMisses.has(key);
  });
  const unclassified = available.filter((entry) => entry.reviews === undefined);
  const targets = unclassified.length ? unclassified : ready.length < 6 ? available : [];
  while (pending.length < BROWSE_BATCH && targets.length) {
    pending.push(...targets.splice(Math.floor(Math.random() * targets.length), 1));
  }
  return pending;
}

async function prefetchDetails(entries, locale) {
  browseBusy = true;
  browseLast = Date.now();
  try {
    const response = await pf.http.get(browseRequest(entries, locale));
    if (response.status !== 200) {
      browseBlocked = Math.max(Date.now() + STORE_RETRY, retryTime(response.headers));
      return;
    }
    const payload = JSON.parse(response.body).response?.store_items;
    if (!Array.isArray(payload) || !payload.length) {
      browseBlocked = Date.now() + STORE_RETRY;
      return;
    }
    const details = browseDetails(payload, entries, locale);
    for (const entry of entries) {
      const key = detailKey(entry.id, locale);
      if (details.has(entry.id)) prepared.set(key, details.get(entry.id));
      else browseMisses.add(key);
    }
    let updatedReviews = false;
    for (const entry of discovery.games) {
      const detail = details.get(entry.id);
      if (detail && entry.reviews !== detail.reviews) {
        entry.reviews = detail.reviews;
        updatedReviews = true;
      }
    }
    if (updatedReviews) saveDiscovery();
    while (prepared.size > BROWSE_CACHE) prepared.delete(prepared.keys().next().value);
    while (browseMisses.size > BROWSE_CACHE) browseMisses.delete(browseMisses.values().next().value);
    const current = game && details.get(game.id);
    if (lang === locale && current && needsDetails()) applyDetails(current, locale);
  } catch {
    browseBlocked = Date.now() + STORE_RETRY;
  } finally {
    browseBusy = false;
    scheduleBrowse();
    scheduleStore();
  }
}

function scheduleBrowse() {
  clearTimeout(browseTimer);
  if (!visible || browseBusy) return;
  const entries = browseTargets();
  if (!entries.length) return;
  const urgent = priorityDetails && needsDetails() && entries[0].id === game.id;
  const after = Math.max(browseBlocked, browseLast + (urgent ? MANUAL_COVER_INTERVAL : HOST_INTERVAL));
  browseTimer = setTimeout(() => prefetchDetails(entries, lang), Math.max(0, after - Date.now()));
}

function defaultCover(id) {
  return { url: CDN + "/store_item_assets/steam/apps/" + id + "/header.jpg", cover: true };
}

async function getStore(path) {
  const response = await pf.http.get(STEAM + path);
  if (response.status !== 200) {
    apiNext = Math.max(apiNext, retryTime(response.headers));
    throw new Error("Steam Store unavailable");
  }
  return response;
}

async function refreshDiscovery() {
  const upper = discovery.total || 100_000;
  const pages = Math.max(1, Math.ceil(upper / DISCOVERY_PAGE_SIZE));
  const ranked = SEARCH_RANKS[discovery.searchRound];
  const [first, limit] = ranked || [0, pages];
  const start = recoveryPage ? 0 : (first + Math.floor(Math.random() * (limit - first))) * DISCOVERY_PAGE_SIZE;
  try {
    const order = ranked ? "filter=topsellers" : "sort_by=Released_DESC";
    const response = await getStore("/search/results/?category1=998&" + order + "&infinite=1"
      + "&hidecomingsoon=1&start=" + start + "&count=" + DISCOVERY_PAGE_SIZE);
    const result = discoveryPage(response);
    recoveryPage = start > 0 && !result.games.length;
    if (!ranked) discovery.total = result.total;
    if (!recoveryPage) discovery.searchRound = (discovery.searchRound + 1) % SEARCH_RANKS.length;
    const previous = new Map(discovery.games.map((entry) => [entry.id, entry]));
    const unseen = new Map();
    for (const entry of [...result.games, ...discovery.games]) {
      if (entry.id !== game?.id && !discovery.recent.includes(entry.id)) {
        unseen.set(entry.id, previous.get(entry.id) || entry);
      }
    }
    discovery.games = [...unseen.values()].slice(0, DISCOVERY_LIMIT);
    let refreshIn = STORE_RETRY;
    if (recoveryPage) refreshIn = HOST_INTERVAL;
    if (result.games.length) {
      refreshIn = catalogWarmup > 0 || discovery.games.length < 7 ? HOST_INTERVAL : INTERVAL;
      catalogWarmup = Math.max(0, catalogWarmup - 1);
    }
    discovery.nextAt = Date.now() + refreshIn;
  } catch {
    discovery.nextAt = Date.now() + STORE_RETRY;
  } finally {
    saveDiscovery();
  }
}

async function getMetadata(expected, requestedLang, id) {
  try {
    const response = await getStore("/api/appdetails?appids=" + id + "&l="
      + (requestedLang === "ru" ? "russian" : "english"));
    if (expected !== serial) return;
    const record = JSON.parse(response.body)[id];
    if (!record?.success || !record.data) throw new Error("Store entry unavailable");
    const details = record.data;
    const tags = (Array.isArray(details.genres) ? details.genres : [])
      .map((entry) => steamText(entry?.description, 60)).filter(Boolean);
    const screenshots = (Array.isArray(details.screenshots) ? details.screenshots : [])
      .map((entry) => artworkUrl(entry?.path_thumbnail || entry?.path_full, id)).filter(Boolean);
    applyDetails({
      description: steamText(details.short_description, 340),
      tags: [...new Set(tags)].slice(0, 4),
      cover: artworkUrl(details.header_image, id),
      screenshots,
    }, requestedLang);
  } catch {
    if (expected !== serial) return;
    detailRetryAt = Date.now() + STORE_RETRY;
    if (!shots.length) installShots([defaultCover(id)]);
  }
}

function scheduleStore() {
  clearTimeout(storeTimer);
  if (!visible || storeBusy) return;
  const catalogAt = discovery.nextAt;
  const fallback = needsDetails() && (browseBlocked > Date.now() || browseMisses.has(detailKey(game.id, lang)));
  const detailsAt = fallback ? detailRetryAt : Infinity;
  const when = Math.min(catalogAt, detailsAt);
  if (!Number.isFinite(when)) return;
  storeTimer = setTimeout(async () => {
    if (!visible || storeBusy) return;
    storeBusy = true;
    apiNext = Date.now() + HOST_INTERVAL;
    try {
      if (catalogAt <= Date.now() && (detailsAt > Date.now() || discovery.games.length < 7)) {
        await refreshDiscovery();
      } else {
        await getMetadata(serial, lang, game.id);
      }
    } finally {
      storeBusy = false;
      scheduleBrowse();
      scheduleStore();
    }
  }, Math.max(0, Math.max(when, apiNext) - Date.now()));
}

function scheduleImage() {
  clearTimeout(imageTimer);
  if (!visible || imageRequest) return;
  const next = shots.findIndex((shot) => !shot.failed && !shot.blob);
  if (next < 0) return;
  const manual = manualCover && next === 0;
  const after = manual ? Math.max(retryImageAt, lastImageStart + MANUAL_COVER_INTERVAL) : imageNext;
  imageTimer = setTimeout(() => downloadImage(next, manual), Math.max(0, after - Date.now()));
}

async function downloadImage(index, userInitiated) {
  const shot = shots[index];
  if (!visible || !shot || shot.blob || shot.failed || imageRequest
    || Date.now() < imageNext && !userInitiated) return;
  if (Date.now() < retryImageAt) return;
  const expected = serial;
  const controller = new AbortController();
  imageRequest = controller;
  lastImageStart = Date.now();
  imageNext = lastImageStart + HOST_INTERVAL;
  const timeout = setTimeout(() => controller.abort("timeout"), 12_000);
  try {
    const response = await fetch(shot.url, {
      credentials: "omit", redirect: "error", signal: controller.signal, referrerPolicy: "no-referrer",
    });
    if (response.status === 429 || response.status === 503) {
      retryImageAt = Math.max(imageNext, retryTime(response.headers));
      imageNext = retryImageAt;
      return;
    }
    if (!response.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get("content-type") || "")) {
      throw new Error("Artwork unavailable");
    }
    if (Number(response.headers.get("content-length")) > 2_000_000) throw new Error("Artwork too large");
    const blob = await response.blob();
    if (!blob.size || blob.size > 2_000_000) throw new Error("Artwork too large");
    if (expected !== serial || !visible) return;
    shot.blob = URL.createObjectURL(blob);
    if (active < 0 || requested === index) showFrame(index);
  } catch {
    if (expected === serial && visible && controller.signal.reason !== "hidden") shot.failed = true;
  } finally {
    clearTimeout(timeout);
    if (imageRequest === controller) imageRequest = null;
    if (expected === serial) {
      drawControls();
      scheduleImage();
      scheduleGallery();
      if (requested >= 0 && !shots[requested]?.blob && Date.now() >= retryImageAt) {
        downloadImage(requested, true);
      }
    }
  }
}

let retryImageAt = 0;

function chooseFrame(index) {
  requested = index;
  if (shots[index]?.blob) showFrame(index);
  else downloadImage(index, true);
  scheduleGallery();
}

function moveGallery(direction, userInitiated) {
  for (let step = 1; step <= shots.length; step++) {
    const index = (Math.max(0, requested >= 0 ? requested : active) + direction * step + shots.length) % shots.length;
    const shot = shots[index];
    if (!shot.failed && (userInitiated || shot.blob) && index !== active) {
      if (userInitiated) chooseFrame(index);
      else { requested = -1; showFrame(index); }
      return;
    }
  }
}

async function showFrame(index) {
  if (!visible || index === active || !shots[index]?.blob) return;
  transition?.cancel();
  for (const node of ui.image.querySelectorAll("img")) if (node !== displayed) node.remove();
  const image = document.createElement("img");
  const expected = serial;
  const url = shots[index].blob;
  image.alt = altText(index);
  image.src = url;
  try {
    await image.decode();
    if (!visible || expected !== serial || requested >= 0 && requested !== index) return;
    ui.image.append(image);
    if (displayed && !reducedMotion.matches) {
      transition = image.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 560, easing: "cubic-bezier(.22,.61,.36,1)",
      });
      await transition.finished;
    }
    if (!visible || expected !== serial) { image.remove(); return; }
    displayed?.remove();
    displayed = image;
    requested = -1;
    active = index;
    drawControls();
  } catch {
    image.remove();
    if (expected === serial && visible && !image.complete) return;
    if (expected === serial && visible && !image.naturalWidth) {
      shots[index].failed = true;
      drawControls();
    }
  }
}

function scheduleGallery() {
  clearInterval(galleryTimer);
  if (visible && !reducedMotion.matches && !ui.gallery.matches(":hover, :focus-within")
    && shots.filter((shot) => shot.blob && !shot.failed).length > 1) {
    galleryTimer = setInterval(() => moveGallery(1, false), SLIDE_INTERVAL);
  }
}

function changeGame(manual = false) {
  serial += 1;
  clearInterval(galleryTimer);
  transition?.cancel();
  imageRequest?.abort("hidden");
  imageRequest = null;
  for (const shot of shots) if (shot.blob) URL.revokeObjectURL(shot.blob);
  shots = [];
  displayed = null;
  active = -1;
  manualCover = manual;
  priorityDetails = manual;
  requested = -1;
  for (const node of ui.image.querySelectorAll("img")) node.remove();
  game = selection.game;
  detailLang = null;
  detailRetryAt = 0;
  localizedDetails = null;
  galleryReady = false;
  ui.steamNotice.hidden = true;
  drawText();
  const details = prepared.get(detailKey(game.id, lang));
  if (details) applyDetails(details, lang);
  else installShots([defaultCover(game.id)]);
  scheduleBrowse();
  scheduleStore();
}

function setVisible(next) {
  if (visible === next) return;
  visible = next;
  document.body.classList.toggle("fence-hidden", !visible);
  if (!visible) {
    clearTimeout(rotating);
    clearTimeout(imageTimer);
    clearTimeout(storeTimer);
    clearTimeout(browseTimer);
    clearInterval(galleryTimer);
    transition?.cancel();
    imageRequest?.abort("hidden");
    return;
  }
  scheduleRotation();
  scheduleGallery();
  scheduleImage();
  scheduleBrowse();
  scheduleStore();
}

function updateSteamStatus(running) {
  steamRunning = Array.isArray(running) && running.includes("steam.exe");
}

async function openStore(event) {
  event.preventDefault();
  if (!game) return;
  const browserUrl = ui.title.href;
  if (steamRunning && !(event.ctrlKey || event.metaKey || event.shiftKey)) {
    try {
      const result = await pf.run(STEAM_PROGRAM, ["-ifrunning", "--", "steam://store/" + game.id]);
      if (result.code === 0) return;
    } catch (error) {
      if (error?.message?.startsWith("pf.run needs ") && error.message.endsWith("which is off")) {
        clearTimeout(steamNoticeTimer);
        ui.steamNotice.hidden = false;
        ui.steamNotice.textContent = labels[lang].steamDisabled;
        steamNoticeTimer = setTimeout(() => { ui.steamNotice.hidden = true; }, 8000);
      }
    }
  }
  pf.open(browserUrl).catch(() => {});
}

if (pf.apps) {
  let statusReceived = false;
  pf.on("apps", ({ running }) => {
    statusReceived = true;
    updateSteamStatus(running);
  });
  pf.apps.running().then((running) => {
    if (!statusReceived) updateSteamStatus(running);
  }).catch(() => {});
}
ui.title.onclick = openStore;
ui.steamdb.onclick = (event) => {
  event.preventDefault();
  if (game) pf.open(ui.steamdb.href).catch(() => {});
};
ui.nextGame.onclick = chooseNextGame;
ui.previous.onclick = () => moveGallery(-1, true);
ui.next.onclick = () => moveGallery(1, true);
for (const event of ["mouseenter", "mouseleave", "focusin", "focusout"]) {
  ui.gallery.addEventListener(event, () => queueMicrotask(scheduleGallery));
}
reducedMotion.addEventListener("change", scheduleGallery);
const resizeObserver = new ResizeObserver(() => { if (game) fitTags(); });
resizeObserver.observe(ui.tags);
document.fonts.ready.then(() => { if (game) fitTags(); });
pf.on("lang", (locale) => {
  lang = locale === "ru" ? "ru" : "en";
  drawText();
  const details = game && prepared.get(detailKey(game.id, lang));
  if (details) applyDetails(details, lang);
  scheduleBrowse();
  scheduleStore();
});
let fenceShown = true;
pf.on("hide", () => { fenceShown = false; setVisible(false); });
pf.on("show", () => { fenceShown = true; setVisible(!document.hidden); });
document.addEventListener("visibilitychange", () => setVisible(fenceShown && !document.hidden));
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.altKey || event.metaKey || event.repeat || !visible) return;
  if (event.code === "KeyN") {
    event.preventDefault();
    chooseNextGame();
  }
});
if (game) changeGame();
scheduleRotation();
