// KRAMA OS Companion Background Service Worker
// In MV3, this is ephemeral and restarts automatically.
chrome.runtime.onInstalled.addListener(() => {
  console.log("KRAMA OS Companion installed.");
});
