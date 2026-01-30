import { scraping, markRecordedScrapings, getRecordedScrapings } from './lib/scraping.js';
import { getCurrentTab, redirectToTargetTab } from './lib/utils.js';
export function register(messageObserver) {
  let isScraping = false;
  messageObserver.on("GET_IS_SCRAPING", (request, sender, sendSuccessResponse, sendFailedResponse) => {
    sendSuccessResponse({ isScraping });
  });
  messageObserver.on("SET_IS_SCRAPING", (request, sender, sendSuccessResponse, sendFailedResponse) => {
    isScraping = request.isScraping;
    sendSuccessResponse();
  });

  messageObserver.on("SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    const tab = await getCurrentTab();

    if (isScraping) {
      sendFailedResponse({}, 'Scraping is already started');
      return;
    }
    isScraping = true;
    const records = await scraping(tab);
    sendSuccessResponse({ records });
  });

  messageObserver.on("STOP_SCRAPING", (request, sender, sendSuccessResponse, sendFailedResponse) => {
    if (!isScraping) {
      sendFailedResponse({}, 'Scraping is not started');
      return;
    }
    isScraping = false;
    sendSuccessResponse();
  });

  messageObserver.on("REDIRECT_SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    await redirectToTargetTab(request.target);
    const _sendSuccessResponse = (...args) => {
      console.log("Scraping completed.", args);
      sendSuccessResponse(...args);
      chrome.tabs.update(sender.tab.id, { active: true });
    }
    messageObserver.emit("SCRAPING", request, sender, _sendSuccessResponse, sendFailedResponse);
  });

  messageObserver.on("MARK_RECORDED_SCRAPINGS", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    await markRecordedScrapings(request.host, request.flags);
    sendSuccessResponse();
  });

  messageObserver.on("GET_RECORDED_SCRAPINGS", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    const recordedScrapings = await getRecordedScrapings(request.host);
    sendSuccessResponse({ recordedScrapings });
  });

}