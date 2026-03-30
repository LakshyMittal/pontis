chrome.runtime.onInstalled.addListener(() => {
  console.log("Pontis installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action !== "open_popup") {
    return false;
  }

  chrome.action.openPopup()
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch((error) => {
      console.warn("Unable to open popup directly", error);
      if (sender?.tab?.id) {
        chrome.action.setBadgeText({ text: "AI", tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: "#5249b8", tabId: sender.tab.id });
      }
      sendResponse({ ok: false, fallback: true });
    });

  return true;
});
