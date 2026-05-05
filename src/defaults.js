// prettier-ignore
const GVO_ENABLED_SITES = [
  "bbc.com", "cnn.com", "nytimes.com", "theguardian.com", "reuters.com",
  "indianexpress.com", "hindustantimes.com", "ndtv.com",
  "timesofindia.indiatimes.com", "deccanherald.com"
];

const GVO_DEFAULT_SETTINGS = {
  enabled: true,
  mode: "mask",
  strictness: "medium",
  debugMode: false,
  enabledSites: GVO_ENABLED_SITES,
  customBlockKeywords: [],
  customAllowKeywords: []
};

// prettier-ignore
const GVO_SITE_SELECTORS = {
  "bbc.com": { card: "article, [data-testid='card-text-wrapper']", title: "h2, h3, [data-testid='card-headline']", summary: "p" },
  "cnn.com": { card: "article, .container__item, .card", title: "h1, h2, h3, .container__headline", summary: ".container__description, p" },
  "nytimes.com": { card: "article", title: "h2, h3", summary: "p" },
  "theguardian.com": { card: "article, li", title: "h2, h3, a", summary: "p" },
  "reuters.com": { card: "article, li, [data-testid*='StoryCard']", title: "h2, h3, a", summary: "p" },
  "indianexpress.com": { card: "article, .articles, .nation, .story", title: "h2, h3, a", summary: "p" },
  "hindustantimes.com": { card: "article, .cartHolder, .storyShortDetail", title: "h2, h3, a", summary: "p" },
  "ndtv.com": { card: "article, .news_Itm, .story_list", title: "h2, h3, a", summary: "p" },
  "timesofindia.indiatimes.com": { card: "article, .uwU81, .news_card, li", title: "h2, h3, a", summary: "p" },
  "deccanherald.com": { card: "main article, main li:has(img), main div:has(> a[href] img):has(h1, h2, h3, h4), main div:has(> img):has(h1, h2, h3, h4)", title: "h1, h2, h3, h4, a", summary: "p, [class*='summary'], [class*='description'], [class*='excerpt']" },
  generic: { card: "article, [class*='card'], [class*='story'], [class*='article'], li", title: "h1, h2, h3, a", summary: "p" }
};
