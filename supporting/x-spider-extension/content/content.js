console.log('X-Spider content script');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request.action, request);
  if (request.action === "RELOAD") {
    window.location.reload();
  }
});