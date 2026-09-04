// KRAMA OS Content Script
// Captures selected text when requested by the popup

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    const selectedText = window.getSelection().toString().trim();
    sendResponse({
      title: document.title,
      url: window.location.href,
      selection: selectedText
    });
  }
  return true; // Keep message channel open for async if needed
});
