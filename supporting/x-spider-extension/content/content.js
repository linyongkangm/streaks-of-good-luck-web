console.log('X-Spider content script');

let isScraping = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request.action, request);
  const sendSuccessResponse = async (data = {}, message) => await sendResponse({ success: true, data, message });
  const sendFailedResponse = async (data = {}, message) => await sendResponse({ success: false, data, message });
  if (request.action === "RELOAD") {
    window.location.reload();
    sendSuccessResponse({}, 'Page reloaded');
  } else if (request.action === "GET_IS_SCRAPING") {
    sendSuccessResponse({ isScraping }, 'isScraping status retrieved');
  } else if (request.action === "SET_IS_SCRAPING") {
    isScraping = request.data.isScraping;
    sendSuccessResponse({}, 'isScraping updated');
  } else if (request.action === "SCRAPING") {
    if (isScraping) {
      sendFailedResponse({}, 'Scraping is already in progress');
      return;
    }
    isScraping = true;
    scrape(request).then(records => {
      isScraping = false;
      sendSuccessResponse({ records }, 'Scraping completed');
    }).catch(error => {
      console.error('Scraping error:', error);
      isScraping = false;
      sendFailedResponse({}, error.message || 'Scraping failed');
    });
  }
  return true;
});

function cleaningAD(element) {
  const scriptElements = element.querySelectorAll('script, style, audio, video');
  scriptElements.forEach(el => el.remove());
}