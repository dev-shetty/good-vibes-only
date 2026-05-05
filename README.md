# Good Vibes Only

A Manifest V3 browser extension that masks negative news cards/headlines on selected news sites.

## MVP status

Implemented now:

- Headlines/cards only
- Local rule-based sentiment/severity scoring
- Hybrid score using negative keywords + allow keywords
- Site-specific selectors with generic fallback
- Mask / blur / hide modes
- MutationObserver for lazy-loaded cards
- Popup controls
- Debug mode that shows score, threshold, matched keywords, allow keywords, and rule hits on each card
- Options page for domains and custom keywords
- No remote API calls

Next:

- Add a browser-compatible local sentiment model via Transformers.js/ONNX
- Tune selectors per site
- Add tests with real headline fixtures
- Improve card detection and false-positive handling

## Load locally

Chrome/Brave/Edge:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Select this folder
5. Visit a configured news site

Firefox support will need Manifest V3 compatibility testing.

## Architecture

- `manifest.json` - extension manifest
- `src/defaults.js` - settings and site selector config
- `src/analyzer.js` - local negative-news scoring
- `src/content.js` - DOM scanning, masking, mutation observer
- `src/popup.html/js` - quick controls
- `src/options.html/js` - site and keyword configuration

## Model plan

The current analyzer is deliberately simple and free. To add `tabularisai/multilingual-sentiment-analysis`, first verify browser compatibility with Transformers.js/ONNX. If it is too large or unsupported, use a smaller browser-compatible multilingual sentiment model and combine its score with the existing keyword severity score.
