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

  const listUrls = new Set([
    "https://www.wsj.com/finance/commodities-futures?page=1",
    "https://www.wsj.com/finance/banking?page=1",
  ]);
  messageObserver.on("BATCH_LIST_SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    let contentUrls = (await Promise.all(
      Array.from(listUrls).map(async (url) => {
        const targetTab = await redirectToTargetTab(url);
        const response = await chrome.tabs.sendMessage(targetTab.id, { action: "SCRAPING_LIST" });
        if (response?.success) {
          const records = response.data.records || [];
          await chrome.tabs.remove(targetTab.id);
          return records;
        } else {
          console.error(`List scraping failed for ${url}. Response:`, response);
          return [];
        }
      })
    )).flat();
    contentUrls = [...new Set(contentUrls)];
    // todo - 过滤已记录的URL
    let index = 0;
    while (index < contentUrls.length) {
      const batchUrls = contentUrls.slice(index, index + 5);
      await Promise.all(batchUrls.map(async (url) => {
        const targetTab = await redirectToTargetTab(url);
        const records = await scraping(targetTab);
        if (records.length > 0) {
          await chrome.tabs.remove(targetTab.id);
          messageObserver.emit("SEND_TO_HOST", {
            type: "STORE_ARTICLE",
            records
          })
        }
      }));
      index += 5;
      await new Promise(resolve => setTimeout(resolve, 5000)); // 每5秒处理5个URL，避免过快打开多个标签页
    }
    sendSuccessResponse();
  });
}