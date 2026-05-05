(() => {
  // 4 levels handles image-link wrappers without climbing to the whole page.
  const CARD_ROOT_CLIMB_DEPTH = 4;
  // 18 chars skips tiny nav links like "World" or "Sports".
  const USEFUL_TEXT_MIN_LENGTH = 18;
  // 40 cards per scan keeps the page responsive on large feeds.
  const CARDS_PER_SCAN = 40;
  const CACHE_KEY_LENGTH = 240;
  const ANALYSIS_TEXT_LENGTH = 500;
  const MUTATION_DEBOUNCE_MS = 350;

  /*
   * when a card element is removed from the DOM (e.g., infinite scroll replaces old content, SPA navigation),
   * there's no longer a strong reference to it.
   * With a WeakSet, the entry is automatically garbage-collected.
   * With a regular Set, those detached DOM nodes would leak memory for the lifetime of the page.
   */
  let processed = new WeakSet();
  const cache = new Map();
  let settings = { ...GVO_DEFAULT_SETTINGS };
  let removedCount = 0;
  let observer;
  let scanTimer;

  function currentHost() {
    return window.location.hostname.replace(/^www\./, "");
  }

  function siteEnabled() {
    const host = currentHost();
    return settings.enabled && settings.enabledSites.some(site => host === site || host.endsWith(`.${site}`));
  }

  function selectorConfig() {
    const host = currentHost();
    // match the site from the list of enabled sites, and suffix match for subdomains
    const matched = Object.keys(GVO_SITE_SELECTORS).find(site => site !== "generic" && (host === site || host.endsWith(`.${site}`)));
    return GVO_SITE_SELECTORS[matched] || GVO_SITE_SELECTORS.generic;
  }

  function loadSettings() {
    return chrome.storage.sync.get(GVO_DEFAULT_SETTINGS).then(stored => {
      settings = { ...GVO_DEFAULT_SETTINGS, ...stored };
      settings.enabledSites = [...new Set([...(GVO_DEFAULT_SETTINGS.enabledSites || []), ...(stored.enabledSites || [])])];
    });
  }

  function readableLength(element) {
    return (element?.innerText || "").replace(/\s+/g, " ").trim().length;
  }

  function resolveCardRoot(candidate) {
    let root = candidate;

    // Some sites, including Deccan Herald, wrap only the image in an <a> and keep
    // the headline in a sibling. Climb a few levels until the root includes text.
    for (let i = 0; i < CARD_ROOT_CLIMB_DEPTH && root?.parentElement; i += 1) {
      const textLength = readableLength(root);
      const hasUsefulText = textLength >= USEFUL_TEXT_MIN_LENGTH;
      const hasImage = !!root.querySelector?.("img") || root.matches?.("img, a:has(img)");
      if (hasUsefulText && (hasImage || root.querySelector?.("h1, h2, h3, h4, a"))) break;
      root = root.parentElement;
    }

    return root || candidate;
  }

  function cardText(card, config) {
    const title = card.matches?.("a") ? card.innerText : card.querySelector(config.title)?.innerText || "";
    const imageAlt = card.querySelector("img[alt]")?.getAttribute("alt") || "";
    const summary = card.querySelector(config.summary)?.innerText || "";
    const ownText = card.innerText || "";
    return `${title || imageAlt || ownText}. ${summary || ownText}`.replace(/\s+/g, " ").trim().slice(0, ANALYSIS_TEXT_LENGTH);
  }

  function removeDebugBadge(card) {
    card.querySelector(":scope > .gvo-debug-badge")?.remove();
  }

  function debugDetails(result) {
    const parts = [];
    if (result.negativeKeywords?.length) parts.push(`keywords: ${result.negativeKeywords.join(", ")}`);
    if (result.allowKeywords?.length) parts.push(`allow: ${result.allowKeywords.join(", ")}`);
    if (result.ruleHits?.length) parts.push(`rules: ${result.ruleHits.join(", ")}`);
    return parts.join(" | ") || "no keyword/rule trigger";
  }

  function addDebugBadge(card, result) {
    if (!settings.debugMode || card.dataset.gvoRemoved === "true") return;
    removeDebugBadge(card);

    const badge = document.createElement("div");
    badge.className = "gvo-debug-badge";
    badge.textContent = `GVO score ${Math.round(result.score * 100)}% / threshold ${Math.round(result.threshold * 100)}% — ${debugDetails(result)}`;
    badge.style.cssText = [
      "display:block",
      "position:relative",
      "z-index:2147483647",
      "margin:4px 0",
      "padding:5px 7px",
      "border:1px solid #16a34a",
      "border-radius:8px",
      "background:#dcfce7",
      "color:#14532d",
      "font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif",
      "box-shadow:0 1px 4px rgba(0,0,0,.12)"
    ].join(";");
    card.prepend(badge);
  }

  function maskCard(card, result) {
    if (card.dataset.gvoRemoved === "true") return;
    card.dataset.gvoRemoved = "true";
    removedCount += 1;

    if (settings.mode === "hide") {
      card.style.display = "none";
      return;
    }

    if (settings.mode === "blur") {
      card.style.filter = "blur(7px)";
      card.style.opacity = "0.45";
      card.title = `Removed by Good Vibes Only (${Math.round(result.score * 100)}%)`;
      return;
    }

    const originalDisplay = card.style.display;
    const originalHTML = card.innerHTML;
    card.innerHTML = "";
    card.style.display = originalDisplay || "block";
    card.style.minHeight = "72px";
    card.style.border = "1px dashed #86efac";
    card.style.borderRadius = "12px";
    card.style.padding = "14px";
    card.style.background = "#f0fdf4";
    card.style.color = "#166534";

    const box = document.createElement("div");
    box.style.font = "14px/1.4 system-ui, -apple-system, Segoe UI, sans-serif";
    box.innerHTML = `<strong>Good Vibes Only</strong><br>Removed a negative headline. <small>Score: ${Math.round(result.score * 100)}% — ${result.reason}${settings.debugMode ? ` — ${debugDetails(result)}` : ""}</small>`;

    const button = document.createElement("button");
    button.textContent = "Show anyway";
    button.style.display = "block";
    button.style.marginTop = "18px";
    button.style.padding = "0";
    button.style.border = "0";
    button.style.background = "transparent";
    button.style.color = "#166534";
    button.style.textDecoration = "underline";
    button.style.textUnderlineOffset = "3px";
    button.style.font = "600 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif";
    button.style.cursor = "pointer";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      card.innerHTML = originalHTML;
      card.removeAttribute("data-gvo-removed");
      card.style.border = "";
      card.style.borderRadius = "";
      card.style.padding = "";
      card.style.background = "";
      card.style.color = "";
    });

    box.appendChild(button);
    card.appendChild(box);
  }

  async function processCards() {
    if (!siteEnabled()) return;
    const config = selectorConfig();
    const cards = [...new Set([...document.querySelectorAll(config.card)].map(resolveCardRoot))].filter(card => !processed.has(card));

    for (const card of cards.slice(0, CARDS_PER_SCAN)) {
      processed.add(card);
      const text = cardText(card, config);
      if (!text || text.length < USEFUL_TEXT_MIN_LENGTH) continue;

      const key = gvoNormalizeText(text).slice(0, CACHE_KEY_LENGTH);
      const result = cache.get(key) || gvoAnalyzeText(text, settings);
      cache.set(key, result);

      addDebugBadge(card, result);
      if (result.shouldRemove) maskCard(card, result);
    }
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(processCards, MUTATION_DEBOUNCE_MS);
  }

  // Observe DOM changes and rescan cards when content updates (dynamic/infinite scroll, SPA, etc).
  function startObserver() {
    observer?.disconnect();
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GVO_STATUS") {
      sendResponse({
        enabled: settings.enabled,
        siteEnabled: siteEnabled(),
        removedCount,
        host: currentHost()
      });
    }
    if (message?.type === "GVO_RELOAD") {
      loadSettings()
        .then(() => {
          processed = new WeakSet();
          document.querySelectorAll(".gvo-debug-badge").forEach(badge => badge.remove());
          return processCards();
        })
        .then(() => sendResponse({ ok: true }));
      return true;
    }
  });

  loadSettings().then(() => {
    if (siteEnabled()) {
      processCards();
      startObserver();
    }
  });
})();
