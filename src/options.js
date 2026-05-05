const SAVE_MESSAGE_TIMEOUT_MS = 1800;

const fields = ["enabledSites", "customBlockKeywords", "customAllowKeywords"];
const msg = document.querySelector("#msg");

function lines(value) {
  return String(value || "")
    .split("\n")
    .map(x => x.trim());
}

async function load() {
  const settings = await chrome.storage.sync.get(GVO_DEFAULT_SETTINGS);
  settings.enabledSites = [...new Set([...(GVO_DEFAULT_SETTINGS.enabledSites || []), ...(settings.enabledSites || [])])];
  document.querySelector("#debugMode").checked = settings.debugMode;
  for (const field of fields) {
    document.querySelector(`#${field}`).value = (settings[field] || []).join("\n");
  }
}

document.querySelector("#save").addEventListener("click", async () => {
  const next = { debugMode: document.querySelector("#debugMode").checked };
  for (const field of fields) next[field] = lines(document.querySelector(`#${field}`).value);
  await chrome.storage.sync.set(next);
  msg.textContent = "Saved.";
  setTimeout(() => (msg.textContent = ""), SAVE_MESSAGE_TIMEOUT_MS);
});

load();
