console.log('X-Spider wsj-content script');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in wsj-content script:', request.action, request);
  if (request.action === "SCRAPING") {
    // scraping(tweetRecords)
    // sendResponse({ success: true, data: { records: Array.from(tweetRecords.values()) } });
  }
});