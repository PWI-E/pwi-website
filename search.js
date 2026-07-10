const options = {
  includeScore: true,
  threshold: 0.2,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: "title", weight: 0.50 },
    { name: "content", weight: 0.45 },
    { name: "url", weight: 0.05 }
  ]
};

(function () {
  const idx = Array.isArray(window.searchIndex) ? window.searchIndex : [];

  function decodeHtmlEntities(value) {
    var text = String(value ?? "");
    if (!text.includes("&")) return text;
    var el = document.createElement("textarea");
    el.innerHTML = text;
    return el.value;
  }

  function isAllowedUrl(url) {
    return !/websitepages_eric's copy/i.test(url);
  }

  const seen = new Set();
  const normalized = idx
    .map(item => ({
      title: decodeHtmlEntities(item?.title).trim(),
      content: decodeHtmlEntities(item?.content).trim(),
      url: String(item?.url ?? "").trim()
    }))
    .filter(item => item.title && item.url && isAllowedUrl(item.url))
    .filter(item => {
      const key = item.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (typeof Fuse === "undefined") {
    console.warn("[search.js] Fuse not loaded, using local fallback search");
    window.fuse = null;
    window.__searchIndexNormalized = normalized;
    return;
  }

  window.fuse = new Fuse(normalized, options);
  window.__searchIndexNormalized = normalized;

  console.log("✅ Search ready:", normalized.length, "pages indexed");
})();
