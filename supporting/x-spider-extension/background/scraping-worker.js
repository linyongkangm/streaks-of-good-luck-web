import { scraping, markRecordedScrapings, getRecordedScrapings } from './lib/scraping.js';
import { getCurrentTab, redirectToTargetTab, getIsScraping, setIsScraping } from './lib/utils.js';
export function register(messageObserver) {
  messageObserver.on("CURRENT_TAB_SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    const tab = await getCurrentTab();
    const records = await scraping(tab);
    sendSuccessResponse({ records });
  });

  messageObserver.on("REDIRECT_TAB_SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    const targetTab = await redirectToTargetTab(request.target);
    const records = await scraping(targetTab);
    sendSuccessResponse({ records });
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