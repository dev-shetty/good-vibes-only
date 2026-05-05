# 🙈 Good Vibes Only

A free, open-source browser extension that filters negative news headlines from your feed. Runs entirely in your browser with no API keys or cloud calls.

**[goodvibesonly.shetty.me](https://goodvibesonly.shetty.me)**

## Features

- Local keyword + rule-based sentiment scoring
- Negative keywords, severity weighting, allow keywords, and pattern rules
- Site-specific selectors with generic fallback
- Three modes: mask, blur, or hide
- Adjustable strictness (low, medium, high)
- MutationObserver for dynamically loaded content
- Popup for quick controls
- Debug mode showing scores, thresholds, and matched keywords
- Options page for domain configuration
- No remote API calls

## Installation

### Chrome / Brave / Edge

1. Download or clone this repository
2. Open `chrome://extensions` in your browser
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the root folder of this project (the one containing `manifest.json`)
6. The extension icon should appear in your toolbar
7. Visit a supported news site to see it in action

### Firefox

1. Download or clone this repository
2. Open `about:debugging` in Firefox
3. Click **This Firefox** in the left sidebar
4. Click **Load Temporary Add-on**
5. Navigate to the root folder of this project and select the `manifest.json` file
6. The extension will be loaded temporarily (it will be removed when Firefox is closed)
7. Visit a supported news site to see it in action

## Architecture

- `manifest.json` - extension manifest
- `src/defaults.js` - settings and site selector config
- `src/analyzer.js` - local negative-news scoring
- `src/content.js` - DOM scanning, masking, mutation observer
- `src/theme.js` - shared theme variables
- `src/popup.html/js` - quick controls
- `src/options.html/js` - site and keyword configuration

## How the scoring works

Headlines are scored 0-100% using a weighted system:

| Signal                              | Weight         | Cap |
| ----------------------------------- | -------------- | --- |
| Negative keyword match              | +28% per match | 85% |
| High severity keyword               | +22% per match | 30% |
| Allow keyword                       | -18% per match | 35% |
| Casualty pattern (e.g. "12 killed") | +35%           | -   |
| Vulnerable person pattern           | +40%           | -   |

The final score is compared against your chosen strictness threshold:

| Strictness       | Threshold |
| ---------------- | --------- |
| Low              | 72%       |
| Medium (default) | 48%       |
| High             | 25%       |

## Roadmap

- Add a browser-compatible local sentiment model via Transformers.js/ONNX
- Tune selectors per site
- Custom block and allow keywords from options page

## Landing page

The `site/` directory contains the landing page, hosted at [goodvibesonly.shetty.me](https://goodvibesonly.shetty.me).

## License

Open source. Built by [Deveesh Shetty](https://shetty.me).
