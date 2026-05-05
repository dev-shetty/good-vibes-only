const GVO_THEME = {
  text: "#5b3a2e",
  muted: "#8a5f3b",
  background: "#fff3df",
  surface: "#fffaf2",
  border: "#c58e58",
  accent: "#ff6b1a",
  accentText: "#ffffff"
};

function gvoApplyThemeVariables(root = document.documentElement) {
  root.style.setProperty("--gvo-text", GVO_THEME.text);
  root.style.setProperty("--gvo-muted", GVO_THEME.muted);
  root.style.setProperty("--gvo-bg", GVO_THEME.background);
  root.style.setProperty("--gvo-surface", GVO_THEME.surface);
  root.style.setProperty("--gvo-border", GVO_THEME.border);
  root.style.setProperty("--gvo-accent", GVO_THEME.accent);
  root.style.setProperty("--gvo-accent-text", GVO_THEME.accentText);
}

if (typeof document !== "undefined") gvoApplyThemeVariables();
