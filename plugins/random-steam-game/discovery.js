const DISCOVERY_PAGE_SIZE = 25;
const DISCOVERY_LIMIT = 120;
const RECENT_LIMIT = 250;
const REVIEW_BANDS = [
  { min: 5000, max: 9000, weight: 35 },
  { min: 9000, max: 20_000, weight: 25 },
  { min: 20_000, max: Infinity, weight: 15 },
  { min: 1000, max: 5000, weight: 10 },
  { min: 500, max: 1000, weight: 10 },
  { min: 0, max: 500, weight: 5 },
];
const SEARCH_RANKS = [null, [0, 40], [40, 140], null];

function randomGame(entries) {
  return entries[Math.floor(Math.random() * entries.length)];
}

function weightedGame(entries, isReady) {
  const bands = REVIEW_BANDS.map((band) => ({ ...band, games: [] }));
  for (const entry of entries) {
    if (entry.reviews === undefined) continue;
    const count = entry.reviews ?? 0;
    const band = bands.find(({ min, max }) => count >= min && count < max);
    if (band) band.games.push(entry);
  }
  const available = bands.filter((band) => band.games.length);
  if (!available.length) return randomGame(entries);
  let roll = Math.random() * available.reduce((total, band) => total + band.weight, 0);
  const bucket = available.find(({ weight }) => (roll -= weight) < 0).games;
  const ready = bucket.filter(isReady);
  return randomGame(ready.length ? ready : bucket);
}

function steamText(value, limit) {
  if (typeof value !== "string" || !value) return "";
  const plain = value.slice(0, 12_000).replace(/<[^>]*>/g, " ").replace(/</g, "&lt;");
  const decoded = plain.includes("&")
    ? new DOMParser().parseFromString("<body>" + plain, "text/html").body.textContent : plain;
  return decoded.replace(/\s+/g, " ").trim().slice(0, limit);
}

function discoveryGame(value) {
  if (!Number.isSafeInteger(value?.id) || value.id <= 0 || typeof value.name !== "string") return null;
  const name = value.name.trim().slice(0, 200);
  if (!name) return null;
  const entry = { id: value.id, name };
  if (value.reviews === null || Number.isSafeInteger(value.reviews) && value.reviews >= 0) {
    entry.reviews = value.reviews;
  }
  return entry;
}

function discoveryPage(response) {
  const data = JSON.parse(response.body);
  const total = Number(data.total_count);
  if (!data.success || typeof data.results_html !== "string" || !Number.isSafeInteger(total) || total < 0) {
    throw new Error("Steam catalog unavailable");
  }
  const result = new Map();
  for (const [, attributes, row] of data.results_html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const id = Number(/\bdata-ds-appid="([1-9]\d*)"/i.exec(attributes)?.[1]);
    const title = /<span\b[^>]*\bclass="title"[^>]*>([\s\S]*?)<\/span>/i.exec(row)?.[1];
    const entry = discoveryGame({ id, name: steamText(title, 200) });
    if (entry) result.set(id, entry);
  }
  return { total, games: [...result.values()] };
}

function readDiscovery(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    const games = Array.isArray(saved?.games) ? saved.games.slice(0, DISCOVERY_LIMIT) : [];
    const recent = Array.isArray(saved?.recent) ? saved.recent.slice(-RECENT_LIMIT) : [];
    const round = saved?.searchRound;
    const knownRound = Number.isInteger(round) && round >= 0 && round < SEARCH_RANKS.length;
    return {
      games: games.map(discoveryGame).filter(Boolean),
      recent: [...new Set(recent.filter((id) => Number.isSafeInteger(id) && id > 0))],
      total: Number.isSafeInteger(saved?.total) && saved.total > 0 ? saved.total : 0,
      nextAt: knownRound && Number.isFinite(saved?.nextAt) ? Math.min(saved.nextAt, Date.now() + 600_000) : 0,
      searchRound: knownRound ? round : games.length ? 1 : 0,
    };
  } catch {
    return { games: [], recent: [], total: 0, nextAt: 0, searchRound: 0 };
  }
}
