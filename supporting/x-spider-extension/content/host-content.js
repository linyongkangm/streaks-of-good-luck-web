console.log('X-Spider host-content script');

document.addEventListener('REDIRECT_TAB_SCRAPING', async function (e) {
  console.log('Custom event received in host-content script:', "REDIRECT_TAB_SCRAPING", e.detail);

  const response = await chrome.runtime.sendMessage({
    ...e.detail,
    action: "REDIRECT_TAB_SCRAPING",
  });
  if (response.success) {
    document.dispatchEvent(new CustomEvent(e.detail.callbackCode, {
      detail: response.data
    }));
  }
});

document.addEventListener('BATCH_LIST_SCRAPING', async function (e) {
  console.log('Custom event received in host-content script:', "BATCH_LIST_SCRAPING", e.detail);

  const response = await chrome.runtime.sendMessage({
    ...e.detail,
    action: "BATCH_LIST_SCRAPING",
  });
  if (response.success) {
    document.dispatchEvent(new CustomEvent(e.detail.callbackCode, {
      detail: response.data
    }));
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in host-content script:', request.action, request);
  if (request.action === "RECEIVE_FROM_EXTENSION") {
    document.dispatchEvent(new CustomEvent(request.payload.type, {
      detail: request.payload
    }));
  }
});