const BROWSE_API = "https://api.steampowered.com";
const BROWSE_BATCH = 12;
const BROWSE_CACHE = 36;

function browseRequest(entries, lang) {
  const region = new Intl.Locale(navigator.language).region;
  const input = {
    ids: entries.map(({ id }) => ({ appid: id })),
    context: {
      language: lang === "ru" ? "russian" : "english",
      country_code: /^[A-Z]{2}$/.test(region || "") ? region : "US",
    },
    data_request: {
      include_basic_info: true,
      include_assets: true,
      include_screenshots: true,
      include_reviews: true,
      include_tag_count: 12,
    },
  };
  return BROWSE_API + "/IStoreBrowseService/GetItems/v1/?input_json=" + encodeURIComponent(JSON.stringify(input));
}

function browseDetails(items, entries, lang) {
  const ids = new Set(entries.map(({ id }) => id));
  const result = new Map();
  for (const item of items) {
    const id = item?.appid;
    if (!ids.has(id) || item.success !== 1 || item.item_type !== 0) continue;
    const assets = item.assets;
    const header = typeof assets?.asset_url_format === "string" && typeof assets.header === "string"
      ? assets.asset_url_format.replace("${FILENAME}", () => assets.header) : "";
    const images = item.screenshots?.all_ages_screenshots;
    const screenshots = Array.isArray(images) ? images.slice(0, 5).map((image) => {
      const file = typeof image?.filename === "string" ? image.filename : "";
      return artworkUrl(CDN + "/store_item_assets/" + file.replace(/\.jpg(?=\?|$)/i, ".600x338.jpg"), id);
    }).filter(Boolean) : [];
    const tags = Array.isArray(item.tagids) ? item.tagids.map((tag) => steamTagNames.get(tag)?.[lang]).filter(Boolean) : [];
    const count = item.reviews?.summary_filtered?.review_count;
    result.set(id, {
      description: steamText(item.basic_info?.short_description, 340),
      tags: [...new Set(tags)].slice(0, 4),
      cover: artworkUrl(CDN + "/store_item_assets/" + header, id),
      screenshots,
      reviews: Number.isSafeInteger(count) && count >= 0 ? count : null,
    });
  }
  return result;
}
