document.addEventListener('DOMContentLoaded', async () => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in sidepanel:', request);
  });
})
