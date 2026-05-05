const enabled = document.querySelector("#enabled");
const debugMode = document.querySelector("#debugMode");
const strictness = document.querySelector("#strictness");
const mode = document.querySelector("#mode");
const statusEl = document.querySelector("#status");
const save = document.querySelector("#save");

function withTimeout(promise, ms = 900) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), ms))]);
}

function storageGet(defaults) {
  const result = chrome.storage.sync.get(defaults);
  if (result?.then) return result;

  return new Promise(resolve => chrome.storage.sync.get(defaults, resolve));
}

function storageSet(values) {
  const result = chrome.storage.sync.set(values);
  if (result?.then) return result;

  return new Promise(resolve => chrome.storage.sync.set(values, resolve));
}

function tabsQuery(query) {
  const result = chrome.tabs.query(query);
  if (result?.then) return result;

  return new Promise(resolve => chrome.tabs.query(query, resolve));
}

function tabsSendMessage(tabId, message) {
  const result = chrome.tabs.sendMessage(tabId, message);
  if (result?.then) return result;

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, response => {
      const error = chrome.runtime.lastError;
      if (error) reject(error);
      else resolve(response);
    });
  });
}

async function activeTab() {
  const [tab] = await tabsQuery({ active: true, currentWindow: true });
  return tab;
}

async function load() {
  try {
    const settings = await storageGet(GVO_DEFAULT_SETTINGS);
    settings.enabledSites = [...new Set([...(GVO_DEFAULT_SETTINGS.enabledSites || []), ...(settings.enabledSites || [])])];
    enabled.checked = settings.enabled;
    debugMode.checked = settings.debugMode;
    strictness.value = settings.strictness;
    mode.value = settings.mode;
  } catch {
    statusEl.textContent = "Could not load settings.";
    return;
  }

  try {
    const tab = await activeTab();
    const status = await withTimeout(tabsSendMessage(tab.id, { type: "GVO_STATUS" }));
    statusEl.textContent = `${status.host}: ${status.siteEnabled ? "active" : "not enabled for this site"}. Removed ${status.removedCount}.`;
  } catch {
    statusEl.textContent = "Open/refresh a supported news page to see filtering status.";
  }
}

save.addEventListener("click", async () => {
  await storageSet({ enabled: enabled.checked, debugMode: debugMode.checked, strictness: strictness.value, mode: mode.value });
  try {
    const tab = await activeTab();
    await withTimeout(tabsSendMessage(tab.id, { type: "GVO_RELOAD" }));
  } catch {}
  window.close();
});

load();
