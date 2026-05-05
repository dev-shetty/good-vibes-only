// prettier-ignore
const GVO_NEGATIVE_KEYWORDS = [
  "death", "dead", "dies", "died", "killed", "murder", "homicide", "suicide",
  "rape", "abuse", "assault", "attack", "stabbed", "shoot", "shot", "gunfire",
  "bomb", "blast", "terror", "war", "invasion", "massacre", "genocide",
  "accident", "crash", "collision", "tragedy", "fatal", "injured", "wounded",
  "kidnap", "missing", "arrested", "crime", "violence", "riot", "threat",
  "cancer", "disease", "outbreak", "pandemic", "flood", "earthquake", "fire"
];

// prettier-ignore
const GVO_ALLOW_KEYWORDS = [
  "rescue", "rescued", "recovered", "wins", "win", "launch", "growth", "festival",
  "celebrates", "success", "award", "record", "breakthrough", "innovation"
];

// prettier-ignore
const GVO_HIGH_SEVERITY_KEYWORDS = [
  "death", "dead", "dies", "died", "killed", "murder", "suicide", "rape",
  "shoot", "bomb", "blast", "massacre", "genocide", "crash", "fatal"
];

const GVO_SCORING = {
  negativeKeywordWeight: 0.28,
  negativeKeywordCap: 0.85,
  highSeverityKeywordWeight: 0.22,
  highSeverityKeywordCap: 0.3,
  allowKeywordWeight: 0.18,
  allowKeywordCap: 0.35,
  casualtyPatternWeight: 0.35,
  vulnerablePersonPatternWeight: 0.4,
  minScore: 0,
  maxScore: 1,
  thresholds: { low: 0.72, medium: 0.48, high: 0.25 }
};

const MIN_KEYWORD_LENGTH_FOR_SUFFIX_MATCH = 4;

function gvoNormalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function gvoEscapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function gvoKeywordPattern(keyword) {
  const normalizedKeyword = gvoNormalizeText(keyword);
  const escaped = gvoEscapeRegex(normalizedKeyword);

  // Conservative suffix matching: "crash" catches "crashes/crashed/crashing" without matching inside bigger words.
  if (new RegExp(`^[a-z]{${MIN_KEYWORD_LENGTH_FOR_SUFFIX_MATCH},}$`).test(normalizedKeyword)) {
    return `\\b${escaped}(?:s|es|ed|ing)?\\b`;
  }

  return `\\b${escaped}\\b`;
}

function gvoFindMatches(text, keywords) {
  const normalized = gvoNormalizeText(text);
  const seen = new Set();

  return keywords.filter(keyword => {
    const normalizedKeyword = gvoNormalizeText(keyword);
    if (!normalizedKeyword || seen.has(normalizedKeyword)) return false;
    seen.add(normalizedKeyword);

    const pattern = new RegExp(gvoKeywordPattern(normalizedKeyword), "i");
    return pattern.test(normalized);
  });
}

function gvoCountMatches(text, keywords) {
  return gvoFindMatches(text, keywords).length;
}

function gvoAnalyzeText(text, settings = GVO_DEFAULT_SETTINGS) {
  const normalized = gvoNormalizeText(text);
  const customBlocks = settings.customBlockKeywords || [];
  const customAllows = settings.customAllowKeywords || [];

  const negativeKeywords = gvoFindMatches(normalized, [...GVO_NEGATIVE_KEYWORDS, ...customBlocks]);
  const allowKeywords = gvoFindMatches(normalized, [...GVO_ALLOW_KEYWORDS, ...customAllows]);
  const highSeverityKeywords = gvoFindMatches(normalized, GVO_HIGH_SEVERITY_KEYWORDS);
  const negativeHits = negativeKeywords.length;
  const allowHits = allowKeywords.length;
  const ruleHits = [];

  let score = 0;
  score += Math.min(GVO_SCORING.negativeKeywordCap, negativeHits * GVO_SCORING.negativeKeywordWeight);
  score += Math.min(GVO_SCORING.highSeverityKeywordCap, highSeverityKeywords.length * GVO_SCORING.highSeverityKeywordWeight);
  score -= Math.min(GVO_SCORING.allowKeywordCap, allowHits * GVO_SCORING.allowKeywordWeight);

  if (highSeverityKeywords.length) ruleHits.push(`high-severity: ${highSeverityKeywords.join(", ")}`);

  if (/\b(\d+|several|many|multiple)\b.*\b(dead|killed|injured|wounded)\b/i.test(normalized)) {
    score += GVO_SCORING.casualtyPatternWeight;
    ruleHits.push("casualty count pattern");
  }

  if (/\b(child|children|woman|women|family)\b.*\b(killed|dead|murder|rape|abuse)\b/i.test(normalized)) {
    score += GVO_SCORING.vulnerablePersonPatternWeight;
    ruleHits.push("vulnerable-person harm pattern");
  }

  score = Math.max(GVO_SCORING.minScore, Math.min(GVO_SCORING.maxScore, score));

  const threshold = GVO_SCORING.thresholds[settings.strictness] || GVO_SCORING.thresholds.medium;

  return {
    shouldRemove: score >= threshold,
    score,
    threshold,
    reason: negativeHits ? `${negativeHits} negative keyword match${negativeHits > 1 ? "es" : ""}` : "no strong negative signal",
    negativeKeywords,
    allowKeywords,
    ruleHits
  };
}
