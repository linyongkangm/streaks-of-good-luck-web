console.log('X-Spider host-content script');

document.addEventListener('REDIRECT_TAB_SCRAPING', async function (e) {
  console.log('Custom event received in host-content script:', "REDIRECT_TAB_SCRAPING", e.detail);

  const response = await chrome.runtime.sendMessage({
    action: "REDIRECT_TAB_SCRAPING",
    target: e.detail.target,
  });
  if (response.success) {
    document.dispatchEvent(new CustomEvent(e.detail.callbackCode, {
      detail: response.data
    }));
  }
});

document.addEventListener('MARK_RECORDED_SCRAPINGS', async function (e) {
  console.log('Custom event received in host-content script:', 'MARK_RECORDED_SCRAPINGS', e.detail);

  chrome.runtime.sendMessage({
    action: "MARK_RECORDED_SCRAPINGS",
    host: e.detail.host,
    flags: e.detail.flags,
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in host-content script:', request.action, request);
  if (request.action === "RECEIVE_FROM_EXTENSION") {
    document.dispatchEvent(new CustomEvent(request.payload.type, {
      detail: request.payload
    }));
  }
});