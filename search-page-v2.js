document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("searchPageBox");
  const resultsBox = document.getElementById("searchResults");
  const countBox = document.getElementById("resultCount");
  const controls = document.getElementById("resultsControls");
  const showMoreBtn = document.getElementById("showMoreBtn");
  const showLessBtn = document.getElementById("showLessBtn");
  const PAGE_SIZE = 4;
  const HARD_MAX_RESULTS = 20;
  const CANDIDATE_LIMIT = 20;
  let lastResults = [];
  let visibleCount = PAGE_SIZE;
  let lastQuery = "";

  countBox.textContent = "Start typing to search";

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeHref(url) {
    var raw = String(url || "#").trim() || "#";
    return raw.replace(/"/g, "&quot;");
  }

  function highlightByQuery(text, query) {
    var safe = escapeHtml(text || "");
    var tokens = String(query || "")
      .trim()
      .split(/\s+/)
      .filter(function (t) { return t.length >= 2; });
    if (!tokens.length) return safe;
    var escaped = tokens.map(function (t) {
      var e = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Prefer whole-word matches so "Air" does not mark inside "Aircraft"
      if (/^[a-z0-9]+$/i.test(t)) return "\\b" + e + "\\b";
      return e;
    });
    var re = new RegExp("(" + escaped.join("|") + ")", "gi");
    return safe.replace(re, "<mark>$1</mark>");
  }

  function prepareSnippetSource(text, title) {
    var clean = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    if (!clean) return "";

    // Strip leftover breadcrumb trails from older index builds
    clean = clean.replace(/\bHome\s*\/(?:\s*[^/\s][^/]*\/?){1,6}/gi, " ");
    clean = clean.replace(/\bSkip to content\b/gi, " ");
    clean = clean.replace(/\s+/g, " ").trim();

    var titleNorm = String(title || "").replace(/\s+/g, " ").trim();
    if (titleNorm && clean.toLowerCase().startsWith(titleNorm.toLowerCase())) {
      clean = clean.slice(titleNorm.length).replace(/^[\s—\-|:]+/, "").trim();
    }

    // Prefer body copy after a repeated title + breadcrumb block when present
    var afterBreadcrumb = clean.match(/\bHome\s*\/[^.]*?\.\s*(.+)$/i);
    if (afterBreadcrumb && afterBreadcrumb[1] && afterBreadcrumb[1].length > 40) {
      clean = afterBreadcrumb[1].trim();
    }

    return clean;
  }

  function getSnippet(text, query, max, title) {
    max = max || 170;
    var clean = prepareSnippetSource(text, title);
    if (!clean) return "No preview available.";
    var tokens = String(query || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(function (t) { return t.length >= 2; });
    var firstHit = -1;
    var lower = clean.toLowerCase();
    for (var ti = 0; ti < tokens.length; ti++) {
      var token = tokens[ti];
      var idx = -1;
      if (/^[a-z0-9]+$/i.test(token)) {
        var wordRe = new RegExp("\\b" + token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
        var wordMatch = lower.match(wordRe);
        if (wordMatch) idx = wordMatch.index;
      } else {
        idx = lower.indexOf(token);
      }
      if (idx !== -1 && (firstHit === -1 || idx < firstHit)) firstHit = idx;
    }
    var start = 0;
    if (firstHit >= 0) start = Math.max(0, firstHit - 45);
    // Prefer starting at a word boundary when we shifted left
    if (start > 0) {
      var boundary = clean.lastIndexOf(" ", start);
      if (boundary > start - 24) start = boundary + 1;
    }
    var end = Math.min(clean.length, start + max);
    var snippet = clean.slice(start, end).trim();
    if (start > 0) snippet = "\u2026" + snippet;
    if (end < clean.length) snippet = snippet + "\u2026";
    return snippet;
  }

  function renderEmpty(message) {
    resultsBox.innerHTML = '<div class="search-empty-state">' + escapeHtml(message) + '</div>';
  }

  function compactValue(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function queryTokens(query) {
    return String(query || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(function (t) { return t.length >= 2; });
  }

  var SEARCH_SYNONYMS = [
    { pattern: /\bking\s+air\b.*\b(interior|cabin)\s+light(?:s)?\b|\bking\s+air\b.*\bled\s+upgrade\b|\bking\s+air\s+cabin\s+light(?:s)?\b/i, terms: ["king air cabin lighting", "king air led cabin", "king air interior upgrade"] },
    { pattern: /\bcitation(?:s)?\b.*\b(interior|cabin)\s+light(?:s)?\b|\bcitation\s+led\s+upgrade\b/i, terms: ["citation led cabin", "citation cabin lighting"] },
    { pattern: /\bfalcon(?:\s+900b)?\b.*\b(interior|cabin)\s+light(?:s)?\b/i, terms: ["falcon 900b led cabin", "falcon cabin lighting"] },
    { pattern: /\bbeechjet\b.*\b(interior|cabin)\s+light(?:s)?\b|\bhawker\s+400xp\b.*\blight(?:s)?\b/i, terms: ["beechjet led cabin", "hawker 400xp led cabin"] },
    { pattern: /\blearjet(?:s)?\b.*\b(interior|cabin)\s+light(?:s)?\b/i, terms: ["learjet led cabin", "learjet cabin lighting"] },
    { pattern: /\bpc-?12\b.*\b(interior|cabin)\s+light(?:s)?\b|\bpilatus\b.*\bcabin\s+light(?:s)?\b/i, terms: ["pilatus pc-12 led cabin", "pc-12 led cabin"] },
    { pattern: /\bdoor\s+light\b|\bentry\s+light\b|\bunderwing\s+light\b/i, terms: ["led entry door underwing light", "entry door underwing light"] },
    { pattern: /\bwing\s*tip\s+light(?:s)?\b|\bwingtip\s+light(?:s)?\b/i, terms: ["led wingtip light assemblies", "wingtip light assembly"] },
    { pattern: /\bice\s+light\s+window(?:s)?\b|\bice\s+window(?:s)?\b/i, terms: ["king air ice light windows", "ice light windows"] },
    { pattern: /\bice\s+light\b/i, terms: ["led ice light"] },
    { pattern: /\bthreaded[\s-]?mount\b/i, terms: ["led ice light threaded mount"] },
    { pattern: /\bbayonet[\s-]?mount\b/i, terms: ["led ice light bayonet mount"] },
    { pattern: /\blogo\s+light\b/i, terms: ["led logo light"] },
    { pattern: /\breading\s+lamp(?:s)?\b|\bmap\s+light(?:s)?\b|\bpassenger\s+light(?:s)?\b/i, terms: ["reading light", "led reading light"] },
    { pattern: /\bdimmer\b|\blight\s+dimmer\b/i, terms: ["led dimming control", "dimming control"] },
    { pattern: /\bno\s+smoking\s+sign(?:\s+light)?\b|\bseat\s+belt\s+sign(?:\s+light)?\b|\bsmoking\s+sign(?:\s+light)?\b/i, terms: ["seat belt smoking sign led backlight", "smoking seat belt sign graphic"] },
    { pattern: /\bstep\s+light\b/i, terms: ["citation led step light", "led step light"] },
    { pattern: /\btransformer(?:s)?\b|\bcustom\s+coil\b/i, terms: ["coil winding transformers", "coil winding"] },
    { pattern: /\bfluxgate\b|\bmagnetometer(?:s)?\b|\bsensor\s+coil\b/i, terms: ["fluxgate magnetometers", "tape wound bobbin cores"] },
    { pattern: /\bfluorescent\s+replacement\b|\bfluorescent\s+ballast\b|\bpower\s+supply\b/i, terms: ["fluorescent power supplies", "fluorescent lighting"] },
    { pattern: /\blight\s+part\s+number(?:s)?\b|\breplacement\s+part(?:s)?\b|\baircraft\s+lighting\s+part(?:s)?\b/i, terms: ["fluorescent light part numbers", "accessories parts"] }
  ];

  var SEARCH_TYPO_ALIASES = [
    { pattern: /\bseatbelt\b/i, terms: ["seat belt", "seat belt sign"] },
    { pattern: /\bnosmoking\b/i, terms: ["no smoking", "no smoking sign"] },
    { pattern: /\bundert? ?wing\b/i, terms: ["underwing", "under wing light"] },
    { pattern: /\bwing\s*tip\b/i, terms: ["wingtip", "wingtip light"] },
    { pattern: /\bmaplite\b|\bmapligh?t\b/i, terms: ["map light", "reading light"] },
    { pattern: /\bread(ing)?\s+lite?s?\b|\blamp\b/i, terms: ["reading light", "reading lamp"] },
    { pattern: /\bcabin\s+lites?\b|\bcabin\s+lamp(?:s)?\b/i, terms: ["cabin lights", "cabin lighting"] },
    { pattern: /\binterior\s+lites?\b/i, terms: ["interior lights", "cabin lights"] },
    { pattern: /\bdimer\b|\bdimmer\b|\bdimming\b/i, terms: ["dimmer", "led dimming control"] },
    { pattern: /\bdoorlite\b|\bdoor\s+lite\b/i, terms: ["door light", "entry light"] },
    { pattern: /\bentrylite\b|\bentry\s+lite\b/i, terms: ["entry light", "door light"] },
    { pattern: /\bicewindow\b|\bice\s+window\b/i, terms: ["ice light windows", "king air ice light windows"] },
    { pattern: /\bpc12\b/i, terms: ["pc-12", "pilatus pc-12"] },
    { pattern: /\bkingair\b/i, terms: ["king air"] },
    { pattern: /\bbeechjett?\b/i, terms: ["beechjet"] },
    { pattern: /\blear\s*jet\b/i, terms: ["learjet"] },
    { pattern: /\bfalcon900b\b/i, terms: ["falcon 900b"] },
    { pattern: /\bcitations?\s*excel\b/i, terms: ["citation excel", "citation 560xl"] },
    { pattern: /\bsmok(ing|e)\s+sign\b/i, terms: ["smoking sign", "no smoking sign"] },
    { pattern: /\bpower\s*supplys\b|\bpwr\s*supply\b/i, terms: ["power supply", "fluorescent power supplies"] }
  ];

  function expandSearchTerms(query) {
    var raw = String(query || "").trim();
    if (!raw) return [];

    var expanded = [raw];
    for (var i = 0; i < SEARCH_SYNONYMS.length; i++) {
      var rule = SEARCH_SYNONYMS[i];
      if (!rule.pattern.test(raw)) continue;
      expanded = expanded.concat(rule.terms);
    }
    for (var j = 0; j < SEARCH_TYPO_ALIASES.length; j++) {
      var typoRule = SEARCH_TYPO_ALIASES[j];
      if (!typoRule.pattern.test(raw)) continue;
      expanded = expanded.concat(typoRule.terms);
    }

    var seen = {};
    return expanded.filter(function (term) {
      var key = compactValue(term);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function queryMatchesExpandedTerms(item, expandedQueries) {
    var haystack = [
      String((item && item.title) || ""),
      String((item && item.url) || "").replace(/[-_.]/g, " "),
      String((item && item.content) || "")
    ].join(" ");

    for (var i = 0; i < expandedQueries.length; i++) {
      var expandedQuery = String(expandedQueries[i] || "").trim();
      if (!expandedQuery) continue;

      var expandedTokens = expandedQuery.split(/\s+/).filter(function (t) { return t.length >= 2; });
      if (!expandedTokens.length) continue;

      var matchesAll = expandedTokens.every(function (token) {
        return tokenMatchRegex(token).test(haystack);
      });
      if (matchesAll) return true;
    }

    return false;
  }

  function getApplicabilityText(item) {
    var content = String((item && item.content) || "");
    if (!content) return "";

    var collected = [];
    var patterns = [
      /APPROVED IN([\s\S]{0,2200})/i,
      /Approved Aircraft(?:\s*&\s*Installation Data)?([\s\S]{0,2200})/i,
      /Compatibility(?:\s*and\s*specs)?\s*:([\s\S]{0,1800})/i
    ];

    for (var i = 0; i < patterns.length; i++) {
      var match = content.match(patterns[i]);
      if (match && match[1]) collected.push(match[1]);
    }

    return collected.join(" ");
  }

  function getApplicabilityMatchStrength(item, expandedQueries) {
    if (!item || !Array.isArray(expandedQueries) || !expandedQueries.length) return 0;

    var applicabilityText = getApplicabilityText(item);
    if (!applicabilityText) return 0;
    if (!queryMatchesExpandedTerms({ title: "", url: "", content: applicabilityText }, expandedQueries)) return 0;

    var category = getPageCategory(item);
    if (category === "product") return 5;
    if (category === "pdf") return 4;
    if (category === "approval" || category === "approval-reference") return 3;
    if (category === "collection") return 2;
    return 1;
  }

  function getAircraftModelAliasGroup(query) {
    var normalized = compactValue(query);
    if (!normalized || /\s/.test(String(query || "").trim())) return null;

    if (normalized === "200" || normalized === "b200" || normalized === "b200gt" || normalized === "250") {
      return {
        familyIntent: "king-air",
        productUrlRe: /king-air-90-100-200\.html$/i,
        pdfUrlRe: /pwi-king-air-90-100-200-b200-250-led-upgrade-pdf\.html$/i,
        collectionUrlRe: /beechcraft-king-air-products\.html$/i,
        familyRe: /\bking\s+air\b/i,
        modelRe: normalized === "250"
          ? /\b250\b|\bb200(?:gt|cgt|t|ct)?\b/i
          : /\b200\b|\bb200(?:gt|cgt|t|ct)?\b/i
      };
    }

    if (normalized === "300" || normalized === "b300" || normalized === "350") {
      return {
        familyIntent: "king-air-300",
        productUrlRe: /king-air-300\.html$/i,
        pdfUrlRe: /pwi-king-air-300-led-cabin-pdf\.html$/i,
        collectionUrlRe: /beechcraft-king-air-products\.html$/i,
        familyRe: /\bking\s+air\b/i,
        modelRe: normalized === "350"
          ? /\b350\b|\bb300\b/i
          : /\b300\b|\bb300\b|\b350\b/i
      };
    }

    if (normalized === "400" || normalized === "400a" || normalized === "400xp") {
      return {
        familyIntent: "beechjet-hawker",
        productUrlRe: /beechjet-400-400a-hawker-400xp-led-cabin-lights\.html$/i,
        pdfUrlRe: /pwi-beechjet-400-led-cabin-pdf\.html$/i,
        collectionUrlRe: /beechjet-hawker-products\.html$/i,
        familyRe: /\bbeechjet\b|\bhawker\b/i,
        modelRe: /\b400(?:a|xp)?\b/i
      };
    }

    if (normalized === "900" || normalized === "900b") {
      return {
        familyIntent: "falcon",
        productUrlRe: /falcon-900b-led-cabin-system\.html$/i,
        pdfUrlRe: /pwi-falcon-900b-led-cabin-pdf\.html$/i,
        collectionUrlRe: null,
        familyRe: /\bfalcon\b/i,
        modelRe: /\b900b?\b/i
      };
    }

    return null;
  }

  function getAircraftModelRelevance(item, modelGroup) {
    if (!item || !modelGroup) return 0;

    var title = String(item.title || "").toLowerCase();
    var url = String(item.url || "").toLowerCase();
    var content = String(item.content || "").toLowerCase();
    var titleUrl = title + " " + url.replace(/[-_.]/g, " ");

    if (modelGroup.productUrlRe && modelGroup.productUrlRe.test(url)) return 5;
    if (modelGroup.pdfUrlRe && modelGroup.pdfUrlRe.test(url)) return 4;
    if (modelGroup.collectionUrlRe && modelGroup.collectionUrlRe.test(url)) return 3;
    if (modelGroup.modelRe.test(titleUrl) && modelGroup.familyRe.test(titleUrl)) return 2;
    if (modelGroup.modelRe.test(content) && /stc-pma-data\.html$|service-bulletins\.html$/i.test(url)) return 1;

    return 0;
  }

  function normalizePartNumber(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
  }

  function getPartNumberIntent(query) {
    var raw = String(query || "").trim().toUpperCase();
    var normalized = normalizePartNumber(raw);
    if (!normalized) return null;

    // Aircraft serial number prefixes — not part numbers
    if (/^(FL|FA|FM|RJ|RK|BB|BJ|BL|BN|BT|BY|BZ|LJ|LW)-\d+$/i.test(raw)) return null;

    var looksStructured = /[A-Z]/.test(raw) && /\d/.test(raw) && !/\s/.test(raw.trim());
    var looksDashed = /^[A-Z0-9]+(?:[-\/][A-Z0-9]+)+$/i.test(raw);
    var looksLongNumeric = /^\d{6,}$/.test(normalized);
    var looksPadded = /^\d{3,}-\d{2,}$/.test(raw);

    if (!looksStructured && !looksDashed && !looksLongNumeric && !looksPadded) return null;

    return {
      raw: raw,
      normalized: normalized
    };
  }

  function getPartNumberMatchStrength(item, partIntent) {
    if (!item || !partIntent) return 0;

    var normalizedQuery = partIntent.normalized;
    var title = String(item.title || "");
    var url = String(item.url || "");
    var content = String(item.content || "");
    var normalizedTitle = normalizePartNumber(title);
    var normalizedUrl = normalizePartNumber(url);
    var normalizedContent = normalizePartNumber(content);
    var isApproval = /stc-pma-data\.html$|service-bulletins\.html$/i.test(url);

    if (normalizedTitle.indexOf(normalizedQuery) !== -1) return 5;
    if (normalizedUrl.indexOf(normalizedQuery) !== -1) return 4;
    if (normalizedContent.indexOf(normalizedQuery) === -1) return 0;
    if (/part number|alternate part number|important part numbers|important part numbers and identifiers/i.test(content)) {
      return isApproval ? 2 : 3;
    }
    return isApproval ? 1 : 2;
  }

  function normalizeTokenForMatch(token) {
    var value = String(token || "").toLowerCase().trim();
    if (/^\d+$/.test(value) || value.length < 4) return value;
    if (/ies$/.test(value) && value.length > 4) return value.slice(0, -3) + "y";
    if (/sses$/.test(value)) return value.slice(0, -2);
    if (/(xes|zes|ches|shes)$/.test(value)) return value.slice(0, -2);
    if (/s$/.test(value) && !/(ss|us|is)$/.test(value)) return value.slice(0, -1);
    return value;
  }

  function tokenMatchRegex(token) {
    var raw = String(token || "").toLowerCase().trim();
    var normalized = normalizeTokenForMatch(raw);
    var escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return /^\d+$/.test(normalized)
      ? new RegExp(escaped, "i")
      : new RegExp("\\b" + escaped + "(?:s|es|ed|ing|er|ers)?\\b", "i");
  }

  function getFamilyIntent(query) {
    var normalized = String(query || "").toLowerCase().trim();
    var modelGroup = getAircraftModelAliasGroup(normalized);
    if (modelGroup) return modelGroup.familyIntent;
    if (/\bright[\s-]?angle\b/.test(normalized)) return "reading-light-right-angle";
    if (/\breading\s+light(?:s)?\b|\breading\s+lamp(?:s)?\b/.test(normalized)) return "reading-light";
    if (/\bice[\s-]?light(?:s)?\b/.test(normalized) && /\bwindow(?:s)?\b/.test(normalized)) return "ice-light-windows";
    if (/\bthreaded[\s-]?mount\b|\bbayonet[\s-]?mount\b/.test(normalized)) return "ice-light";
    if (/\bice[\s-]?light(?:s)?\b/.test(normalized)) return "ice-light";
    if (/\bstep[\s-]?light(?:s)?\b/.test(normalized)) return "step-light";
    if (/^f[lam]-\d+$/i.test(normalized.trim())) return "king-air-300";
    if (/\bking\s+air\b.*\b(300|b300|350)\b|\b(300|b300|350)\b.*\bking\s+air\b|\b(b300|350)\b/.test(normalized)) return "king-air-300";
    if (/\bking\s+airs?\b|\bb200\b|\bb200gt\b/.test(normalized)) return "king-air";
    if (/\bbaron\s*(55|58|58a)?\b|\bb55\b|\be55\b|\bg58\b/.test(normalized)) return "baron";
    if (/\bcitations?\b|\bcj[1-4]\b|\b(525|550|560|650)\b/.test(normalized)) return "citation";
    if (/\blearjets?\b/.test(normalized)) return "learjet";
    if (/\bfalcons?\b|\b900b?\b/.test(normalized)) return "falcon";
    if (/\bbeechjets?\b|\bhawkers?\b|\b400[aAxX]?\b/.test(normalized)) return "beechjet-hawker";
    if (/\b(303|1308|1309|1495)\b/.test(normalized)) return "reading-light";
    if (/\bcoil\s+winding\b.*\btransformer(?:s)?\b|\btransformer(?:s)?\b.*\bcoil\s+winding\b/.test(normalized)) return "coil-winding";
    if (/\btape[\s-]?wound\b.*\bbobbin\b.*\bcores?\b/.test(normalized)) return "bobbin-cores";
    if (/\bfluxgate\b.*\bmagnetometer(?:s)?\b|\bmagnetometer(?:s)?\b.*\bfluxgate\b/.test(normalized)) return "fluxgate";
    if (/\bcustom\b.*\bengineering\b/.test(normalized)) return "custom-engineering";
    if (/\bcontract\b.*\bmanufacturing\b/.test(normalized)) return "contract-manufacturing";
    if (/\bfluorescent\b.*\blighting\b/.test(normalized)) return "fluorescent-lighting";
    if (/\bfluorescent\b.*\bpower\b.*\bsuppl(?:y|ies)\b/.test(normalized)) return "fluorescent-power-supplies";
    if (/\bfluorescent\b.*\blight\b.*\bpart\b.*\bnumbers?\b/.test(normalized)) return "fluorescent-light-part-numbers";
    if (/\bdoor\s+light\b|\bentry\s+light\b|\bunderwing\s+light\b|\bdoorlite\b|\bentrylite\b/.test(normalized)) return "door-underwing-light";
    if (/\bwing\s*tip\s+light(?:s)?\b|\bwingtip\s+light(?:s)?\b/.test(normalized)) return "wingtip-light";
    if (/\bno\s*smoking\s+sign\b|\bnosmoking\s+sign\b|\bseat\s*belt\s+sign\b|\bseatbelt\s+sign\b|\bsmoking\s+sign\b/.test(normalized)) return "seat-belt-sign";
    if (/\bdimmer\b|\blight\s+dimmer\b/.test(normalized)) return "dimming-control";
    return "";
  }

  function familyTitleStrength(item, familyIntent) {
    var title = String((item && item.title) || "").toLowerCase();
    var url = String((item && item.url) || "").toLowerCase();
    if (!title) return 0;
    if (familyIntent === "reading-light-right-angle") {
      if (/303-right-angle-reading-light\.html$/.test(url)) return 5;
      if (/\bright\s+angle\b/.test(title)) return 4;
      if (/\b303\b/.test(title)) return 2;
      return 0;
    }
    if (familyIntent === "reading-light") {
      var isReadingTitle = /\breading\s+light(?:s)?\b|\breading\s+lamp(?:s)?\b/.test(title);
      var isRightAngle = /\bright\s+angle\b/.test(title);
      var isCoreReadingProduct = /\b(303|1308|1309|1495)\b/.test(title);
      if (isReadingTitle && isCoreReadingProduct && !isRightAngle) return 4;
      if (isReadingTitle && !isRightAngle) return 3;
      if (isReadingTitle && isRightAngle) return 2;
      if (isCoreReadingProduct) return 1;
    }
    if (familyIntent === "king-air-300") {
      if (/king-air-300\.html$/.test(url)) return 5;
      if (/pwi-king-air-300-led-cabin-pdf\.html$/.test(url)) return 4;
      if (/product-pdfs\/PWI-Products-King-Air\.pdf$/i.test(url)) return 4;
      if (/stc-pma-data\.html$/.test(url)) return 3;
      if (/\b(300|b300|350)\b/.test(title)) return 2;
      return 0;
    }
    if (familyIntent === "king-air") {
      if (/king-air-90-100-200\.html$/.test(url)) return 5;
      if (/beechcraft-king-air-products\.html$/.test(url)) return 4;
      if (/product-pdfs\/PWI-Products-King-Air\.pdf$/i.test(url)) return 4;
      if (/stc-pma-data\.html$/.test(url)) return 3;
      if (/\bking\s+air\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "baron") {
      if (/led-ice-light\.html$/.test(url)) return 5;
      if (/1495-led-reading-light\.html$/.test(url)) return 4;
      if (/led-dimming-control-system\.html$/.test(url)) return 3;
      if (/stc-pma-data\.html$/.test(url)) return 2;
      if (/\bbaron\b/.test(title)) return 2;
      return 0;
    }
    if (familyIntent === "citation") {
      if (/citation-products\.html$/.test(url)) return 5;
      if (/product-pdfs\/PWI-Products-Citation-Jet\.pdf$/i.test(url)) return 4;
      if (/\bcitation\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "learjet") {
      if (/learjet-led-cabin-lights\.html$/.test(url)) return 5;
      if (/\blearjet\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "falcon") {
      if (/falcon-900b-led-cabin-system\.html$/.test(url)) return 5;
      if (/\bfalcon\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "beechjet-hawker") {
      if (/beechjet-hawker-products\.html$/.test(url)) return 5;
      if (/product-pdfs\/PWI-Products-Beechjet-Hawker\.pdf$/i.test(url)) return 4;
      if (/\bbeechjet\b|\bhawker\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "coil-winding") {
      if (/coil-winding-transformers\.html$/.test(url)) return 5;
      if (/\bcoil\s+winding\b|\btransformer(?:s)?\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "bobbin-cores") {
      if (/tape-wound-bobbin-cores-magnetometers\.html$/.test(url)) return 5;
      if (/\btape[\s-]?wound\b|\bbobbin\b|\bcores?\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "fluxgate") {
      if (/fluxgate-magnetometers\.html$/.test(url)) return 5;
      if (/\bfluxgate\b|\bmagnetometer(?:s)?\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "custom-engineering") {
      if (/engineering\.html$/.test(url)) return 5;
      if (/\bcustom\b.*\bengineering\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "contract-manufacturing") {
      if (/contract-manufacturing\.html$/.test(url)) return 5;
      if (/\bcontract\b.*\bmanufacturing\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "fluorescent-lighting") {
      if (/fluorescent-lighting\.html$/.test(url)) return 5;
      if (/\bfluorescent\b.*\blighting\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "fluorescent-power-supplies") {
      if (/fluorescent-power-supplies\.html$/.test(url)) return 5;
      if (/\bfluorescent\b.*\bpower\b.*\bsuppl(?:y|ies)\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "fluorescent-light-part-numbers") {
      if (/fluorescent-light-part-numbers\.html$/.test(url)) return 5;
      if (/\bfluorescent\b.*\blight\b.*\bpart\b.*\bnumbers?\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "ice-light") {
      if (/led-ice-light\.html$/.test(url)) return 5;
      if (/pwi-led-ice-light-pdf\.html$/.test(url)) return 4;
      if (/stc-pma-data\.html$/.test(url)) return 3;
      if (/\bice[\s-]?light\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "ice-light-windows") {
      if (/king-air-ice-light-windows\.html$/.test(url)) return 5;
      if (/pwi-king-air-ice-light-windows-pdf\.html$/.test(url)) return 4;
      if (/stc-pma-data\.html$/.test(url)) return 3;
      if (/\bice[\s-]?light\b/.test(title) && /\bwindow\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "step-light") {
      if (/citation-led-step-light\.html$/.test(url)) return 5;
      if (/pwi-led-step-light-citation-pdf\.html$/.test(url)) return 4;
      if (/stc-pma-data\.html$/.test(url)) return 3;
      if (/\bstep[\s-]?light\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "door-underwing-light") {
      if (/led-cabin-door-underwing-light\.html$/.test(url)) return 5;
      if (/pwi-led-cabin-door-underwing-light-pdf\.html$/.test(url)) return 4;
      if (/stc-pma-data\.html$/.test(url)) return 3;
      if (/\bentry\b|\bdoor\b|\bunderwing\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "wingtip-light") {
      if (/led-wingtip-light-assemblies\.html$/.test(url)) return 5;
      if (/pwi-led-wingtip-light-assembly-pdf\.html$/.test(url)) return 4;
      if (/stc-pma-data\.html$/.test(url)) return 3;
      if (/\bwingtip\b|\bwing\s*tip\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "seat-belt-sign") {
      if (/led-no-smoking-seat-belt-sign\.html$/.test(url)) return 5;
      if (/smoking-fasten-seat-belt-sign-graphic\.html$/.test(url)) return 4;
      if (/stc-pma-data\.html$/.test(url)) return 3;
      if (/\bseat\s+belt\b|\bno\s+smoking\b|\bsmoking\s+sign\b/.test(title)) return 3;
      return 0;
    }
    if (familyIntent === "dimming-control") {
      if (/led-dimming-control-system\.html$/.test(url)) return 5;
      if (/pwi-led-dimming-control-system-pdf\.html$/.test(url)) return 4;
      if (/stc-pma-data\.html$/.test(url)) return 3;
      if (/\bdimming\s+control\b|\bdimmer\b/.test(title)) return 3;
      return 0;
    }
    return 0;
  }

  function isSpecificProductIntent(familyIntent) {
    return /^(reading-light|reading-light-right-angle|ice-light|ice-light-windows|step-light|door-underwing-light|wingtip-light|seat-belt-sign|dimming-control)$/.test(String(familyIntent || ""));
  }

  function titleMatchStrength(item, query) {
    var title = String((item && item.title) || "").toLowerCase();
    var titleCompact = compactValue(title);
    var queryCompact = compactValue(query);
    var tokens = queryTokens(query);

    if (!title || !tokens.length) return 0;
    if (queryCompact && titleCompact.indexOf(queryCompact) !== -1) return 4;

    var matched = tokens.filter(function (token) {
      return tokenMatchRegex(token).test(title);
    }).length;

    if (matched === tokens.length) return 3;
    if (matched >= Math.max(2, tokens.length - 1)) return 2;
    if (matched >= 1) return 1;
    return 0;
  }

  function getPageCategory(item) {
    var url = String((item && item.url) || "").toLowerCase().trim();
    var title = String((item && item.title) || "").toLowerCase().trim();

    if (!url || /^-?$/.test(url)) return "other";
    if (/^\/(?:index\.html)?$/.test(url) || url === "/led-lighting.html") return "landing";
    if (/press-releases\.html$/.test(url) || /press\/.*\.pdf$/i.test(url)) return "press";
    if (/-pdf\.html$/.test(url) || /\.pdf$/i.test(url) || /\bpdf\b|\bliterature\b/.test(title)) return "pdf";
    if (/stc-pma-data\.html$/.test(url) || /certifications-qualifications\.html$/.test(url)) return "approval";
    if (/service-bulletins\.html$/.test(url)) return "approval-reference";
    if (/-photos\.html$/.test(url) || /collection-of-images\.html$/.test(url) || /\bphoto gallery\b/.test(title)) return "photo";
    if (/-products\.html$/.test(url)) return "collection";
    // Company / info pages — not product pages
    if (/\/(contact|about-us|authorized-dealers-distributors|engineering|contract-manufacturing|faq|terms-and-conditions|request-quote|signup|general-inquiry|fluorescent-power-supplies|overhauled-power-supplies)\.html$/.test(url)) return "other";
    if (/\.html$/.test(url)) return "product";
    return "other";
  }

  function isEngineeringManufacturingUrl(url) {
    return /\/(coil-winding-transformers|fluxgate-magnetometers|tape-wound-bobbin-cores-magnetometers|contract-manufacturing|engineering)\.html$/i.test(String(url || ""));
  }

  function isDealersPageUrl(url) {
    return /authorized-dealers-distributors\.html$/i.test(String(url || ""));
  }

  function isAboutPageUrl(url) {
    return /about-us\.html$/i.test(String(url || ""));
  }

  function isContactPageUrl(url) {
    return /contact\.html$/i.test(String(url || ""));
  }

  function isCertificationsPageUrl(url) {
    return /certifications-qualifications\.html$/i.test(String(url || ""));
  }

  function looksLikeAboutIntent(query) {
    var normalized = String(query || "").toLowerCase().trim();
    if (!normalized) return false;
    return /\babout(?:\s+us)?\b|\bpwi(?:\s+inc)?\b|\bcompany\s+history\b|\bwichita(?:\s+kansas|\s+ks)?\b|\bmiklos\s+lorik\b|\brobi\s+lorik\b|\brick\s+estes\b|\bas9100\b|\bitar\b/.test(normalized);
  }

  function looksLikeContactIntent(query) {
    var normalized = String(query || "").toLowerCase().trim();
    if (!normalized) return false;
    return /\bcontact\b|\bphone(?:\s+number)?\b|\bemail\b|\bcall\b|\breach\b|\bquote\b|\bsupport\b|\bsales\b|\beric\s+dahlinger\b|\bheather\s+dautrich\b|\bjack\s+putnam\b|\bjacob\s+barkley\b|\badi\s+anand\b|\bommanda\s+trask\b|\bbob\s+johnston\b|\brick\s+estes\b/.test(normalized);
  }

  function looksLikeCertificationsIntent(query) {
    var normalized = String(query || "").toLowerCase().trim();
    if (!normalized) return false;
    return /\bcertification(?:s)?\b|\bqualification(?:s)?\b|\bcompliance\b|\bregulatory\b|\bfaa\s+pma\b|\bfaa\s+repair\s+station\b|\beasa\b|\buk\s+caa\b|\bas9100\b|\biso\s*9001\b|\bitar\b|\btcca\b|\bapproval\s+letters?\b/.test(normalized);
  }

  function looksLikeTermsIntent(query) {
    var normalized = String(query || "").toLowerCase().trim();
    if (!normalized) return false;
    return /\bterms?\b|\bconditions?\b|\bwarranty\b|\bwarrantee\b|\breturn(?:\s+policy|\s+of\s+material)?\b|\bcredit\s+terms?\b|\bpayment\s+terms?\b|\bnet\s+30\b|\border\s+cancellation\b|\bcancellation\s+policy\b|\bfreight\b|\bshipping\s+terms?\b|\btransit\s+damage\b|\bgoverning\s+law\b|\bjurisdiction\b|\btaxes?\b|\bcustoms?\b|\btariff(?:s)?\b|\brma\b/.test(normalized);
  }

  function isTermsPageUrl(url) {
    return /terms-and-conditions\.html$/i.test(String(url || ""));
  }

  function looksLikeFaqIntent(query) {
    var normalized = String(query || "").toLowerCase().trim();
    if (!normalized) return false;
    return /\bfaq(?:s)?\b|\bfrequently\s+asked\b|\blumens?\b|\bcolor\s+temp(?:erature)?\b|\bcolour\s+temp(?:erature)?\b|\b4[01][05]0\s*k\b|\bwhy\s+(?:upgrade|led|switch)\b|\bled\s+benefit(?:s)?\b|\bled\s+advantage(?:s)?\b|\bhow\s+(?:do\s+i\s+)?(?:buy|order|purchase)\b|\bwhere\s+(?:to\s+)?(?:buy|order|purchase)\b/.test(normalized);
  }

  function isFaqPageUrl(url) {
    return /faq\.html$/i.test(String(url || ""));
  }

  function pageTypeWeight(item) {
    switch (getPageCategory(item)) {
      case "product":
        return -0.18;
      case "pdf":
        return 0.14;
      case "approval":
        return -0.04;
      case "approval-reference":
        return 0.02;
      case "collection":
        return 0.12;
      case "photo":
        return 0.24;
      case "landing":
        return 0.28;
      case "press":
        return 0.36;
      case "other":
        return -0.10; // company/info pages — slight base boost so they can surface
      default:
        return 0.05;
    }
  }

  function rankedScore(result, query, looksLikePart) {
    var baseScore = Number(result && result.score);
    if (!isFinite(baseScore)) baseScore = 1;
    var item = result && result.item;
    var title = String((item && item.title) || "").toLowerCase();
    var url = String((item && item.url) || "").toLowerCase();
    var content = String((item && item.content) || "").toLowerCase();
    var queryText = String(query || "").trim().toLowerCase();
    var compactQuery = compactValue(queryText);
    var compactTitle = compactValue(title);
    var compactUrl = compactValue(url);
    var compactContent = compactValue(content);
    var pageCategory = getPageCategory(item);
    var titleStrength = titleMatchStrength(item, queryText);
    var aircraftModelGroup = getAircraftModelAliasGroup(queryText);
    var aircraftModelRelevance = getAircraftModelRelevance(item, aircraftModelGroup);
    var partIntent = getPartNumberIntent(queryText);
    var partMatchStrength = getPartNumberMatchStrength(item, partIntent);
    var applicabilityMatchStrength = getApplicabilityMatchStrength(item, expandSearchTerms(queryText));
    var score = baseScore + pageTypeWeight(item);

    if (compactQuery) {
      var isGenericLanding = pageCategory === "landing";
      var isMediaGallery = pageCategory === "photo" && /collection-of-images\.html$/.test(url);
      var isPressPage = /press-releases\.html$/.test(url);
      var queryInTitle = compactTitle.indexOf(compactQuery) !== -1;
      var queryInContent = compactContent.indexOf(compactQuery) !== -1;
      var queryInUrl = compactUrl.indexOf(compactQuery) !== -1;
      var strongMatch = queryInTitle || queryInContent || queryInUrl;

      // Suppress generic landing pages for all queries — too broad
      if (isGenericLanding) score += 0.28;
      // Suppress media gallery — almost never what a product search needs
      if (isMediaGallery) score += 0.35;
      // Press releases: suppress for generic short queries ("400"), surface for specific model searches ("560XL", "citation 650")
      if (isPressPage) score += (queryInContent && compactQuery.length > 3) ? 0.05 : 0.22;
      // Push photos well below product/pdf/approval pages
      if (pageCategory === "photo") score += 0.30;
      // Boost aircraft-specific collection pages when query matches title — surface them early.
      // Skip the big boost when the query names a specific model (has a digit), so the
      // collection/hub page doesn't outrank that model's own dedicated product page.
      var queryHasModelNumber = /\d/.test(compactQuery);
      if (pageCategory === "collection" && queryInTitle && !queryHasModelNumber) score -= 1.20;
      else if (pageCategory === "collection" && queryInTitle) score -= 0.20;
      else if (pageCategory === "collection" && queryInContent) score -= 0.30;
      // Strong title matches should beat compatibility-list mentions.
      if (pageCategory === "product" && titleStrength >= 4) score -= 0.34;
      else if (pageCategory === "product" && titleStrength >= 3) score -= 0.24;
      else if (pageCategory === "product" && titleStrength === 2) score -= 0.10;
      else if (pageCategory === "product" && titleStrength === 0 && queryInContent && !looksLikePart) score += 0.40;
      // Boost company/info pages when the query matches their title (dealers, engineering, FAQ, etc.)
      if (pageCategory === "other" && titleStrength >= 3) score -= 0.28;
      else if (pageCategory === "other" && titleStrength === 2) score -= 0.14;
      else if (pageCategory === "other" && titleStrength === 1) score -= 0.06;

      // Boost STC/PMA page whenever the queried aircraft/product appears in its content
      // For part-number queries, STC page ranks 3rd (below product + PDF), so give it less boost
      if (/stc-pma-data\.html$/.test(url) && queryInContent) score -= looksLikePart ? 0.05 : 0.18;
      else if ((pageCategory === "approval" || pageCategory === "approval-reference") && titleStrength === 0 && queryInContent) score += 0.12;
      // Boost pages where the query appears near the start of the title (first ~2 words)
      var compactQueryNoSpaces = compactQuery.replace(/\s+/g, '');
      var titleStartIdx = compactTitle.indexOf(compactQueryNoSpaces);
      if (queryInTitle && titleStartIdx >= 0 && titleStartIdx <= 8) score -= 0.14;
      // Keep the search intent focused on the main document types users care about most.
      if (strongMatch && pageCategory === "product") score -= 0.22;
      if (strongMatch && pageCategory === "pdf") score += (looksLikePart ? 0.06 : 0.28);
      // Boost product catalog PDFs when the query matches their title
      if (!looksLikePart && pageCategory === "pdf" && /product-pdfs\//i.test(url) && queryInTitle) score -= 0.85;
      if (strongMatch && pageCategory === "approval") score -= 0.08;
      if (strongMatch && pageCategory === "approval-reference") score -= 0.03;
      // Extra boost for main cabin lighting pages over accessory pages (step light, ice light, etc.)
      if (!looksLikePart && /cabin.*light|led.*cabin/i.test(title) && queryInTitle) score -= 0.12;
      // Boost certifications page for compliance/regulatory queries
      var looksLikeCert = /as9100|iso.?9001|easa|uk.?caa|repair.?station|certif|qualif|approv|compliance|regulatory|rev.?d/i.test(queryText);
      var looksLikeStcQuery = /\bstc\b|\bpma\b|supplement|sa0[0-9]|afac|anac|tcca|caac|supplement.?[0-9]/i.test(queryText);
      if (looksLikeCert && /certifications-qualifications\.html$/.test(url)) score -= 0.30;
      if ((looksLikeCert || looksLikeStcQuery) && /stc-pma-data\.html$/.test(url)) score -= 0.25;

      if (aircraftModelGroup) {
        if (aircraftModelRelevance >= 5) score -= 1.00;
        else if (aircraftModelRelevance === 4) score -= 0.72;
        else if (aircraftModelRelevance === 3) score -= 0.42;
        else if (aircraftModelRelevance === 2) score -= 0.24;
        else if (aircraftModelRelevance === 1) score -= 0.10;
        else if (pageCategory === "product" && queryInContent) score += 0.72;
        else if (pageCategory === "pdf" && queryInContent) score += 0.34;
        else if (pageCategory === "collection" && queryInContent) score += 0.18;
      }

      if (partIntent) {
        if (partMatchStrength >= 5) score -= 1.00;
        else if (partMatchStrength === 4) score -= 0.78;
        else if (partMatchStrength === 3) score -= 0.48;
        else if (partMatchStrength === 2) score -= 0.18;
        else if (partMatchStrength === 1) score += 0.06;
        else if (pageCategory === "product" && queryInContent) score += 0.85;
        else if (pageCategory === "pdf" && queryInContent) score += 0.45;
        else if (pageCategory === "approval" || pageCategory === "approval-reference") score += 0.18;
      }

      if (!partIntent && !aircraftModelGroup && applicabilityMatchStrength) {
        if (applicabilityMatchStrength >= 5) score -= 0.78;
        else if (applicabilityMatchStrength === 4) score -= 0.52;
        else if (applicabilityMatchStrength === 3) score -= 0.18;
        else if (applicabilityMatchStrength === 2) score -= 0.08;
      }
    }

    if (looksLikePart && compactQuery) {
      var exactInTitle = compactTitle.indexOf(compactQuery) !== -1;
      var exactInUrl = compactUrl.indexOf(compactQuery) !== -1;
      var exactInContent = compactContent.indexOf(compactQuery) !== -1;
      var isStcPage = /stc-pma-data\.html$/.test(url);
      var isReferencePage = pageCategory === "approval" || pageCategory === "approval-reference";
      var isProductPage = pageCategory === "product";

      // Product page is always #1 for part number queries
      if (isProductPage && (exactInTitle || exactInUrl || exactInContent)) score -= 0.45;
      if (isReferencePage && exactInContent) score += 0.14;
      if (exactInTitle) score -= 0.05;
      if (exactInUrl) score -= 0.03;
      // Extra photo penalty for number queries (total +0.24 with shared block above)
      if (pageCategory === "photo") score += 0.08;
      // PDF is always #2 — ranks above STC page but below product page
      if (pageCategory === "pdf" && exactInContent) score -= 0.30;
      // STC/PMA page sits at #3 — already handled in general section above
      // Extra collection page boost for number queries (total -0.26 with shared block above)
      if (pageCategory === "collection" && exactInContent) score -= 0.08;

      if (partIntent) {
        if (pageCategory === "product" && partMatchStrength >= 3) score -= 0.36;
        if (pageCategory === "pdf" && partMatchStrength >= 3) score -= 0.18;
        if (isReferencePage && partMatchStrength >= 1) score += 0.12;
        if (pageCategory === "collection") score += 0.22;
      }
    }

    return score;
  }

  function buildLocalFuse() {
    var normalized = Array.isArray(window.__searchIndexNormalized)
      ? window.__searchIndexNormalized
      : [];
    return new Fuse(normalized, {
      includeScore: true,
      threshold: 0.38,
      ignoreLocation: true,
      minMatchCharLength: 2,
      shouldSort: true,
      keys: [
        { name: "title", weight: 0.50 },
        { name: "content", weight: 0.45 },
        { name: "url", weight: 0.05 }
      ]
    });
  }

  function buildFallbackResults(query) {
    var normalized = Array.isArray(window.__searchIndexNormalized)
      ? window.__searchIndexNormalized
      : [];
    var expandedQueries = expandSearchTerms(query);
    var tokens = expandedQueries
      .join(" ")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(function (t) { return t.length >= 2; });

    return normalized
      .map(function (item) {
        var haystacks = [
          String(item.title || "").toLowerCase(),
          String(item.url || "").toLowerCase().replace(/[-_.]/g, " "),
          String(item.content || "").toLowerCase()
        ];
        var score = 0;
        for (var i = 0; i < tokens.length; i++) {
          var token = tokens[i];
          var inTitle = haystacks[0].indexOf(token) !== -1;
          var inUrl = haystacks[1].indexOf(token) !== -1;
          var inContent = haystacks[2].indexOf(token) !== -1;
          if (!inTitle && !inUrl && !inContent) return null;
          if (inTitle) score += 6;
          if (inUrl) score += 3;
          if (inContent) score += 1;
        }
        return { item: item, score: 1 / Math.max(score, 1) };
      })
      .filter(Boolean)
      .sort(function (a, b) { return rankedScore(a, query, /[0-9]/.test(query)) - rankedScore(b, query, /[0-9]/.test(query)); })
      .slice(0, CANDIDATE_LIMIT);
  }

  function prioritizePrimaryCategories(results, familyIntent) {
    var ordered = Array.isArray(results) ? results.slice() : [];

    if (familyIntent) {
      ordered = ordered
        .filter(function (r) {
          return familyTitleStrength(r && r.item, familyIntent) > 0;
        })
        .sort(function (a, b) {
          var aStrength = familyTitleStrength(a && a.item, familyIntent);
          var bStrength = familyTitleStrength(b && b.item, familyIntent);
          if (aStrength !== bStrength) return bStrength - aStrength;
          return rankedScore(a, lastQuery, /[0-9]/.test(lastQuery)) - rankedScore(b, lastQuery, /[0-9]/.test(lastQuery));
        });

      if (ordered.length) return ordered;
    }

    var used = {};
    var promoted = [];

    function takeFirst(matchFn) {
      for (var i = 0; i < ordered.length; i++) {
        if (used[i]) continue;
        if (!matchFn(ordered[i])) continue;
        used[i] = true;
        promoted.push(ordered[i]);
        return;
      }
    }

    // Priority order for all queries: product page → product PDF → STC/PMA approval
    takeFirst(function (r) {
      return getPageCategory(r && r.item) === "product";
    });
    takeFirst(function (r) {
      return getPageCategory(r && r.item) === "pdf";
    });
    takeFirst(function (r) {
      var category = getPageCategory(r && r.item);
      return category === "approval" || category === "approval-reference";
    });

    for (var j = 0; j < ordered.length; j++) {
      if (!used[j]) promoted.push(ordered[j]);
    }

    return promoted;
  }

  function prioritizeKingAir300Results(results, familyIntent) {
    if (!Array.isArray(results) || !results.length || familyIntent !== "king-air-300") return results;

    var ordered = results.slice();
    var used = {};
    var promoted = [];

    function takeFirstByUrl(urlRe) {
      for (var i = 0; i < ordered.length; i++) {
        if (used[i]) continue;
        var url = String((ordered[i].item && ordered[i].item.url) || "");
        if (!urlRe.test(url)) continue;
        used[i] = true;
        promoted.push(ordered[i]);
        return;
      }
    }

    takeFirstByUrl(/king-air-300\.html$/i);
    takeFirstByUrl(/pwi-king-air-300-led-cabin-pdf\.html$/i);
    takeFirstByUrl(/product-pdfs\/PWI-Products-King-Air\.pdf$/i);
    takeFirstByUrl(/stc-pma-data\.html$/i);

    for (var j = 0; j < ordered.length; j++) {
      if (!used[j]) promoted.push(ordered[j]);
    }

    return promoted;
  }

  function getKingAir200Intent(query, familyIntent) {
    var normalized = String(query || "").toLowerCase();
    if (familyIntent !== "king-air") return false;
    return /\bking\s+air\b.*\b(90|100|200|b200|250)\b|\b(90|100|200|b200|250)\b.*\bking\s+air\b|\bb200\b|\b250\b/.test(normalized);
  }

  function prioritizeKingAir200Results(results, query, familyIntent) {
    if (!Array.isArray(results) || !results.length || !getKingAir200Intent(query, familyIntent)) return results;

    var ordered = results.slice();
    var used = {};
    var promoted = [];

    function takeFirstByUrl(urlRe) {
      for (var i = 0; i < ordered.length; i++) {
        if (used[i]) continue;
        var url = String((ordered[i].item && ordered[i].item.url) || "");
        if (!urlRe.test(url)) continue;
        used[i] = true;
        promoted.push(ordered[i]);
        return;
      }
    }

    takeFirstByUrl(/king-air-90-100-200\.html$/i);
    takeFirstByUrl(/pwi-king-air-90-100-200-b200-250-led-upgrade-pdf\.html$/i);
    takeFirstByUrl(/product-pdfs\/PWI-Products-King-Air\.pdf$/i);
    takeFirstByUrl(/stc-pma-data\.html$/i);

    for (var j = 0; j < ordered.length; j++) {
      if (!used[j]) promoted.push(ordered[j]);
    }

    return promoted.length ? promoted : results;
  }

  function getExact1495Intent(query) {
    var normalized = String(query || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (normalized !== "1495" && normalized !== "ge1495" && normalized !== "1495x" && normalized !== "ge1495x") return null;

    return {
      productRe: /\/1495-led-reading-light\.html$/i,
      literatureRe: /\/pwi-led-replacement-reading-lights-pdf\.html$/i,
      approvalRe: /stc-pma-data\.html$/i
    };
  }

  function prioritizeExact1495Results(results, query) {
    var intent = getExact1495Intent(query);
    if (!intent) return results;

    var source = [];
    var seen = {};

    function addResult(result) {
      var item = result && result.item;
      var url = String((item && item.url) || "");
      if (!url || seen[url]) return;
      seen[url] = true;
      source.push(result);
    }

    (Array.isArray(results) ? results : []).forEach(addResult);
    (window.__searchIndexNormalized || []).forEach(function (item) {
      var url = String((item && item.url) || "");
      if (intent.productRe.test(url) || intent.literatureRe.test(url) || intent.approvalRe.test(url)) {
        addResult({ item: item, score: 0.20 });
      }
    });

    var promoted = [];
    function takeFirstByUrl(urlRe) {
      for (var i = 0; i < source.length; i++) {
        var item = source[i] && source[i].item;
        var url = String((item && item.url) || "");
        if (!urlRe.test(url)) continue;
        promoted.push(source[i]);
        return;
      }
    }

    takeFirstByUrl(intent.productRe);
    takeFirstByUrl(intent.literatureRe);
    takeFirstByUrl(intent.approvalRe);

    return promoted.length ? promoted : results;
  }

  function ensureStcPageForAircraftProductSearch(results, query, looksLikePart) {
    var list = Array.isArray(results) ? results.slice() : [];
    var stcUrlRe = /stc-pma-data\.html$/;
    var alreadyIncluded = list.some(function (r) {
      return stcUrlRe.test(String((r && r.item && r.item.url) || ""));
    });
    if (alreadyIncluded) return list;

    var hasAircraftProductResult = list.some(function (r) {
      var item = r && r.item;
      var category = getPageCategory(item);
      var url = String((item && item.url) || "");
      return (category === "product" || category === "collection" || category === "pdf") &&
        !isEngineeringManufacturingUrl(url);
    });
    if (!hasAircraftProductResult) return list;

    var stcItem = (window.__searchIndexNormalized || []).find(function (item) {
      return stcUrlRe.test(String(item && item.url || ""));
    });
    if (!stcItem) return list;

    list.push({ item: stcItem, score: looksLikePart ? 0.35 : 0.42 });
    return list
      .sort(function (a, b) {
        return rankedScore(a, query, looksLikePart) - rankedScore(b, query, looksLikePart);
      });
  }

  function ensureCatalogPdfForFamilySearch(results, query, familyIntent, looksLikePart) {
    var catalogMap = {
      "king-air":       /product-pdfs\/PWI-Products-King-Air\.pdf$/i,
      "king-air-300":   /product-pdfs\/PWI-Products-King-Air\.pdf$/i,
      "beechjet-hawker":/product-pdfs\/PWI-Products-Beechjet-Hawker\.pdf$/i,
      "citation":       /product-pdfs\/PWI-Products-Citation-Jet\.pdf$/i
    };
    var catalogRe = catalogMap[familyIntent];
    if (!catalogRe) return Array.isArray(results) ? results : [];
    var list = Array.isArray(results) ? results.slice() : [];
    var alreadyIncluded = list.some(function (r) { return catalogRe.test(String((r && r.item && r.item.url) || "")); });
    if (alreadyIncluded) return list;
    var catalogItem = (window.__searchIndexNormalized || []).find(function (item) { return catalogRe.test(String(item && item.url || "")); });
    if (!catalogItem) return list;
    list.push({ item: catalogItem, score: 0.80 });
    return list.sort(function (a, b) { return rankedScore(a, query, looksLikePart) - rankedScore(b, query, looksLikePart); });
  }

  function ensureDealersPageForPartnerSearch(results, query, looksLikePart) {
    if (looksLikePart) return Array.isArray(results) ? results : [];
    var list = Array.isArray(results) ? results.slice() : [];
    var alreadyIncluded = list.some(function (r) {
      return isDealersPageUrl(r && r.item && r.item.url);
    });
    if (alreadyIncluded) return list;

    var dealersItem = (window.__searchIndexNormalized || []).find(function (item) {
      return isDealersPageUrl(item && item.url);
    });
    if (!dealersItem) return list;

    var haystack = [
      String(dealersItem.title || ""),
      String(dealersItem.url || "").replace(/[-_.]/g, " "),
      String(dealersItem.content || "")
    ].join(" ");
    var tokens = queryTokens(query);
    if (!tokens.length) return list;
    var matchesAll = tokens.every(function (token) {
      return tokenMatchRegex(token).test(haystack);
    });
    if (!matchesAll) return list;

    list.push({ item: dealersItem, score: 0.38 });
    return list.sort(function (a, b) {
      return rankedScore(a, query, looksLikePart) - rankedScore(b, query, looksLikePart);
    });
  }

  function ensureAboutPageForCompanySearch(results, query, looksLikePart) {
    if (looksLikePart || !looksLikeAboutIntent(query)) return Array.isArray(results) ? results : [];
    var list = Array.isArray(results) ? results.slice() : [];
    var alreadyIncluded = list.some(function (r) {
      return isAboutPageUrl(r && r.item && r.item.url);
    });
    if (alreadyIncluded) return list;

    var aboutItem = (window.__searchIndexNormalized || []).find(function (item) {
      return isAboutPageUrl(item && item.url);
    });
    if (!aboutItem) return list;

    list.push({ item: aboutItem, score: 0.30 });
    return list.sort(function (a, b) {
      var aIsAbout = isAboutPageUrl(a && a.item && a.item.url);
      var bIsAbout = isAboutPageUrl(b && b.item && b.item.url);
      if (aIsAbout !== bIsAbout) return aIsAbout ? -1 : 1;
      return rankedScore(a, query, looksLikePart) - rankedScore(b, query, looksLikePart);
    });
  }

  function ensureContactPageForContactSearch(results, query, looksLikePart) {
    if (looksLikePart || !looksLikeContactIntent(query)) return Array.isArray(results) ? results : [];
    var list = Array.isArray(results) ? results.slice() : [];
    var alreadyIncluded = list.some(function (r) {
      return isContactPageUrl(r && r.item && r.item.url);
    });
    if (alreadyIncluded) return list;

    var contactItem = (window.__searchIndexNormalized || []).find(function (item) {
      return isContactPageUrl(item && item.url);
    });
    if (!contactItem) return list;

    list.push({ item: contactItem, score: 0.29 });
    return list.sort(function (a, b) {
      var aIsContact = isContactPageUrl(a && a.item && a.item.url);
      var bIsContact = isContactPageUrl(b && b.item && b.item.url);
      if (aIsContact !== bIsContact) return aIsContact ? -1 : 1;
      return rankedScore(a, query, looksLikePart) - rankedScore(b, query, looksLikePart);
    });
  }

  function ensureTermsPageForTermsSearch(results, query, looksLikePart) {
    if (looksLikePart || !looksLikeTermsIntent(query)) return Array.isArray(results) ? results : [];
    var list = Array.isArray(results) ? results.slice() : [];
    var alreadyIncluded = list.some(function (r) {
      return isTermsPageUrl(r && r.item && r.item.url);
    });
    if (alreadyIncluded) return list;

    var termsItem = (window.__searchIndexNormalized || []).find(function (item) {
      return isTermsPageUrl(item && item.url);
    });
    if (!termsItem) return list;

    list.push({ item: termsItem, score: 0.28 });
    return list.sort(function (a, b) {
      var aIsTerms = isTermsPageUrl(a && a.item && a.item.url);
      var bIsTerms = isTermsPageUrl(b && b.item && b.item.url);
      if (aIsTerms !== bIsTerms) return aIsTerms ? -1 : 1;
      return rankedScore(a, query, looksLikePart) - rankedScore(b, query, looksLikePart);
    });
  }

  function ensureFaqPageForFaqSearch(results, query, looksLikePart) {
    if (looksLikePart || !looksLikeFaqIntent(query)) return Array.isArray(results) ? results : [];
    var list = Array.isArray(results) ? results.slice() : [];
    var alreadyIncluded = list.some(function (r) {
      return isFaqPageUrl(r && r.item && r.item.url);
    });
    if (alreadyIncluded) return list;

    var faqItem = (window.__searchIndexNormalized || []).find(function (item) {
      return isFaqPageUrl(item && item.url);
    });
    if (!faqItem) return list;

    list.push({ item: faqItem, score: 0.28 });
    return list.sort(function (a, b) {
      var aIsFaq = isFaqPageUrl(a && a.item && a.item.url);
      var bIsFaq = isFaqPageUrl(b && b.item && b.item.url);
      if (aIsFaq !== bIsFaq) return aIsFaq ? -1 : 1;
      return rankedScore(a, query, looksLikePart) - rankedScore(b, query, looksLikePart);
    });
  }

  function ensureCertificationsPageForComplianceSearch(results, query, looksLikePart) {
    if (looksLikePart || !looksLikeCertificationsIntent(query)) return Array.isArray(results) ? results : [];
    var list = Array.isArray(results) ? results.slice() : [];
    var alreadyIncluded = list.some(function (r) {
      return isCertificationsPageUrl(r && r.item && r.item.url);
    });
    if (alreadyIncluded) return list;

    var certificationsItem = (window.__searchIndexNormalized || []).find(function (item) {
      return isCertificationsPageUrl(item && item.url);
    });
    if (!certificationsItem) return list;

    list.push({ item: certificationsItem, score: 0.28 });
    return list.sort(function (a, b) {
      var aIsCertifications = isCertificationsPageUrl(a && a.item && a.item.url);
      var bIsCertifications = isCertificationsPageUrl(b && b.item && b.item.url);
      if (aIsCertifications !== bIsCertifications) return aIsCertifications ? -1 : 1;
      return rankedScore(a, query, looksLikePart) - rankedScore(b, query, looksLikePart);
    });
  }

  function ensureFuse() {
    if (window.fuse && typeof window.fuse.search === "function") return true;
    if (!Array.isArray(window.__searchIndexNormalized) || window.__searchIndexNormalized.length === 0) {
      countBox.textContent = "Search index is empty";
      renderEmpty("No indexed pages found.");
      return false;
    }
    if (typeof Fuse === "undefined") {
      console.warn("[search] Fuse not loaded, using local fallback search");
      countBox.textContent = "Search running in fallback mode";
      return true;
    }
    window.fuse = buildLocalFuse();
    return true;
  }

  function updateControls(total) {
    var hasMore = total > visibleCount;
    var canCollapse = visibleCount > PAGE_SIZE;
    if (hasMore || canCollapse) {
      controls.classList.remove("hidden");
      controls.removeAttribute("aria-hidden");
      showMoreBtn.classList.toggle("hidden", !hasMore);
      showLessBtn.classList.toggle("hidden", !canCollapse);
    } else {
      controls.classList.add("hidden");
      controls.setAttribute("aria-hidden", "true");
      showMoreBtn.classList.add("hidden");
      showLessBtn.classList.add("hidden");
    }
  }

  function renderResults() {
    var total = lastResults.length;
    var visible = lastResults.slice(0, visibleCount);
    if (!total) {
      countBox.textContent = 'No results for "' + lastQuery + '"';
      resultsBox.innerHTML = '<div class="search-empty-state">No results found. Try searching by aircraft model or part number, or <a href="contact.html" class="search-empty-link">contact us</a> and we\'ll help you find what you need.</div>';
      controls.classList.add("hidden");
      return;
    }
    countBox.textContent = "Showing " + visible.length + " of " + total + ' result(s) for "' + lastQuery + '"';
    resultsBox.innerHTML = visible
      .map(function (r) {
        var item = r.item;
        var titleText = (item && item.title) || "Untitled";
        var baseUrl = String((item && item.url) || "#").trim() || "#";
        if (window.location.protocol === "file:" && baseUrl.charAt(0) === "/") {
          baseUrl = baseUrl.slice(1);
        }
        if (lastQuery && baseUrl !== "#" && /stc-pma-data\.html/.test(baseUrl)) {
          baseUrl += (baseUrl.indexOf("?") === -1 ? "?" : "&") + "q=" + encodeURIComponent(lastQuery);
        }
        var snippetText = getSnippet(item && item.content, lastQuery, 170, titleText);
        var title = highlightByQuery(titleText, lastQuery);
        var snippet = highlightByQuery(snippetText, lastQuery);
        return '<a href="' + escapeHtml(baseUrl) + '" class="search-card search-result-card block rounded-xl border border-slate-200 p-6">' +
          '<h3 class="search-result-title font-serif">' + title + '</h3>' +
          '<p class="search-result-snippet">' + snippet + '</p>' +
          '</a>';
      })
      .join("");
    updateControls(total);
  }

  function runSearch(rawQuery) {
    var query = String(rawQuery == null ? "" : rawQuery).trim();
    lastQuery = query;
    visibleCount = PAGE_SIZE;
    if (!query) {
      lastResults = [];
      resultsBox.innerHTML = "";
      countBox.textContent = "Start typing to search";
      controls.classList.add("hidden");
      return;
    }
    if (!ensureFuse()) {
      if (!resultsBox.innerHTML) {
        renderEmpty("Search engine failed to initialize.");
      }
      controls.classList.add("hidden");
      return;
    }
    var aircraftModelGroup = getAircraftModelAliasGroup(query);
    var partIntent = getPartNumberIntent(query);
    var familyIntent = getFamilyIntent(query);
    var looksLikePart = Boolean(partIntent) || (/[0-9]/.test(query) && !familyIntent && !aircraftModelGroup);
    var expandedQueries = expandSearchTerms(query);
    if (typeof Fuse === "undefined" || !window.fuse || typeof window.fuse.search !== "function") {
      lastResults = buildFallbackResults(query);
      renderResults();
      return;
    }
    var titleOnlyFuse = new Fuse(Array.isArray(window.__searchIndexNormalized) ? window.__searchIndexNormalized : [], {
      includeScore: true,
      threshold: looksLikePart ? 0.35 : 0.20,
      ignoreLocation: true,
      minMatchCharLength: 2,
      useExtendedSearch: true,
      shouldSort: true,
      keys: [{ name: "title", weight: 1.0 }]
    });

    var exact = [];
    var titlePhrase = [];
    var fuzzy = [];
    for (var eqi = 0; eqi < expandedQueries.length; eqi++) {
      var expandedQuery = expandedQueries[eqi];
      if (looksLikePart) {
        exact = exact.concat(window.fuse.search('="' + expandedQuery + '"', { limit: 100 }));
        fuzzy = fuzzy.concat(window.fuse.search(expandedQuery, { limit: 100 }));
      } else {
        titlePhrase = titlePhrase.concat(titleOnlyFuse.search('="' + expandedQuery + '"', { limit: 100 }));
        fuzzy = fuzzy.concat(titleOnlyFuse.search(expandedQuery, { limit: 100 }));
      }
    }
    // For text queries, also search full content as fallback so names/content-only terms are found.
    // Use exact extended search first (ensures short names like "Eric", "Rick", "Adi" are always found),
    // then add fuzzy results as a secondary pass so partial terms still work.
    var contentFallback = [];
    if (!looksLikePart) {
      for (var cqi = 0; cqi < expandedQueries.length; cqi++) {
        var contentQuery = expandedQueries[cqi];
        var contentExact = window.fuse.search('="' + contentQuery + '"', { limit: 100 });
        var contentFuzzy = window.fuse.search(contentQuery, { limit: 100 });
        contentFallback = contentFallback.concat(contentExact).concat(contentFuzzy);
      }
    }
    var bestByUrl = {};
    var all = exact.concat(titlePhrase).concat(fuzzy).concat(contentFallback);
    for (var i = 0; i < all.length; i++) {
      var r = all[i];
      var key = String((r.item && r.item.url) || "").trim();
      if (!key) continue;
      if (!bestByUrl[key] || (r.score || 1) < (bestByUrl[key].score || 1)) {
        bestByUrl[key] = r;
      }
    }
    lastResults = Object.keys(bestByUrl)
      .map(function (k) { return bestByUrl[k]; })
      .sort(function (a, b) { return rankedScore(a, query, looksLikePart) - rankedScore(b, query, looksLikePart); })
      .slice(0, CANDIDATE_LIMIT);

    // Guarantee STC/PMA page appears for part number queries — Fuse can miss it
    // because its content is very long and dense with numbers
    if (looksLikePart) {
      var stcAlreadyIn = lastResults.some(function(r) {
        return /stc-pma-data\.html$/.test(String((r.item && r.item.url) || ""));
      });
      if (!stcAlreadyIn) {
        var stcItem = (window.__searchIndexNormalized || []).find(function(item) {
          return /stc-pma-data\.html$/.test(String(item.url || ""));
        });
        if (stcItem && compactValue(String(stcItem.content || "")).indexOf(compactValue(query)) !== -1) {
          lastResults.push({ item: stcItem, score: 0.35 });
        }
      }
    }

    var isExactPartQuery = /^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(query);
    if (isExactPartQuery || partIntent) {
      var compactQuery = partIntent ? partIntent.normalized.toLowerCase() : compactValue(query);
      var exactPartMatches = lastResults.filter(function (r) {
        var item = r.item || {};
        return (partIntent ? normalizePartNumber(item.title).toLowerCase() : compactValue(item.title)).indexOf(compactQuery) !== -1 ||
               (partIntent ? normalizePartNumber(item.url).toLowerCase() : compactValue(item.url)).indexOf(compactQuery) !== -1 ||
               (partIntent ? normalizePartNumber(item.content).toLowerCase() : compactValue(item.content)).indexOf(compactQuery) !== -1;
      });
      if (exactPartMatches.length) {
        lastResults = exactPartMatches;
      }
    }

    if (partIntent) {
      lastResults = lastResults.filter(function (r) {
        var category = getPageCategory(r && r.item);
        var matchStrength = getPartNumberMatchStrength(r && r.item, partIntent);
        if (matchStrength >= 3) return true;
        return (category === "approval" || category === "approval-reference") && matchStrength >= 1;
      });
    }

    // Suppress "other" category pages (FAQ, About, Dealers, etc.) unless their title strongly matches
    if (!looksLikePart) {
      lastResults = lastResults.filter(function(r) {
        if (getPageCategory(r.item) !== "other") return true;
        return titleMatchStrength(r.item, query) >= 2;
      });
    }

    // Require ALL significant words to appear somewhere in title/url/content
    // Remove photo/gallery pages unless the user is specifically searching for them
    var wantsGallery = /\b(photo|gallery|image|picture)\b/i.test(query);
    if (!wantsGallery) {
      lastResults = lastResults.filter(function(r) {
        return getPageCategory(r.item) !== "photo";
      });
    }

    var hasApplicabilityProductMatch = lastResults.some(function (r) {
      return getApplicabilityMatchStrength(r && r.item, expandedQueries) >= 5;
    });

    if (isSpecificProductIntent(familyIntent)) {
      lastResults = lastResults.filter(function (r) {
        return getPageCategory(r.item) !== "landing";
      });
    }

    if (hasApplicabilityProductMatch) {
      lastResults = lastResults.filter(function (r) {
        var category = getPageCategory(r.item);
        return category !== "landing" && category !== "press";
      });
    }

    // For text (non-part) queries: product pages must have at least a weak title match.
    // This removes pages that only mention the query deep in a compatibility list
    // (e.g. "Beechjet 400" appearing in "learjet" results because learjet is listed inside it).
    if (!looksLikePart) {
      lastResults = lastResults.filter(function(r) {
        if (getPageCategory(r.item) !== "product") return true;
        return titleMatchStrength(r.item, query) >= 1 ||
          getApplicabilityMatchStrength(r && r.item, expandedQueries) >= 5 ||
          (familyIntent && familyTitleStrength(r.item, familyIntent) >= 3);
      });
    }

    // Applies to all multi-word queries — prevents unrelated pages slipping through
    var queryTokens = query.trim().split(/\s+/).filter(function(t) { return t.length >= 2; });
    if (queryTokens.length > 1) {
      lastResults = lastResults.filter(function (r) {
        return queryMatchesExpandedTerms(r && r.item, expandedQueries);
      });
    } else if (!looksLikePart) {
      // Single word text query — require whole-word match
      lastResults = lastResults.filter(function (r) {
        return queryMatchesExpandedTerms(r && r.item, expandedQueries);
      });
    }

    if (aircraftModelGroup) {
      lastResults = lastResults.filter(function (r) {
        var category = getPageCategory(r && r.item);
        var relevance = getAircraftModelRelevance(r && r.item, aircraftModelGroup);
        if (relevance >= 2) return true;
        return (category === "approval" || category === "approval-reference") && relevance >= 1;
      });
    }

    lastResults = ensureStcPageForAircraftProductSearch(lastResults, query, looksLikePart && !partIntent);
    lastResults = ensureCatalogPdfForFamilySearch(lastResults, query, familyIntent, looksLikePart);
    lastResults = ensureDealersPageForPartnerSearch(lastResults, query, looksLikePart);
    lastResults = ensureAboutPageForCompanySearch(lastResults, query, looksLikePart);
    lastResults = ensureContactPageForContactSearch(lastResults, query, looksLikePart);
    lastResults = ensureCertificationsPageForComplianceSearch(lastResults, query, looksLikePart);
    lastResults = ensureTermsPageForTermsSearch(lastResults, query, looksLikePart);
    lastResults = ensureFaqPageForFaqSearch(lastResults, query, looksLikePart);
    lastResults = prioritizePrimaryCategories(lastResults, familyIntent);
    lastResults = prioritizeKingAir300Results(lastResults, familyIntent);
    lastResults = prioritizeKingAir200Results(lastResults, query, familyIntent);
    lastResults = prioritizeExact1495Results(lastResults, query);
    lastResults = lastResults.slice(0, HARD_MAX_RESULTS);

    renderResults();
  }

  showMoreBtn.addEventListener("click", function () {
    visibleCount += PAGE_SIZE;
    renderResults();
  });

  showLessBtn.addEventListener("click", function () {
    visibleCount = PAGE_SIZE;
    renderResults();
  });

  input.addEventListener("input", function () {
    runSearch(input.value);
  });

  var params = new URLSearchParams(window.location.search);
  var urlQuery = params.get("q");
  if (urlQuery) {
    input.value = urlQuery;
    runSearch(urlQuery);
    setTimeout(function () {
      runSearch(urlQuery);
    }, 180);
  } else {
    ensureFuse();
  }
});
