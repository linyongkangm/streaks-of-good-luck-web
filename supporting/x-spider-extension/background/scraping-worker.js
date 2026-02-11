import { scraping, markRecordedScrapings, getRecordedScrapings } from './lib/scraping.js';
import { getCurrentTab, redirectToTargetTab, getIsScraping, setIsScraping } from './lib/utils.js';
export function register(messageObserver) {
  messageObserver.on("CURRENT_TAB_SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    const tab = await getCurrentTab();
    const records = await scraping(tab);
    sendSuccessResponse({ records });
  });

  messageObserver.on("STOP_SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
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