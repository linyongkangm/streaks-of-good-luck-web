import { scraping, markRecordedScrapings, getRecordedScrapings } from './lib/scraping.js';
import { getCurrentTab, redirectToTargetTab, getIsScraping, setIsScraping, getHostTab } from './lib/utils.js';
export function register(messageObserver) {
  messageObserver.on("CURRENT_TAB_SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    const tab = await getCurrentTab();
    const records = await scraping(tab);
    sendSuccessResponse({ records });
  });

  messageObserver.on("REDIRECT_TAB_SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    console.log("Received REDIRECT_TAB_SCRAPING message:", request);
    const targetTab = await redirectToTargetTab(request.target);
    const records = await scraping(targetTab, request.existingFlags);
    sendSuccessResponse({ records });
  });

  messageObserver.on("BATCH_LIST_SCRAPING", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    let contentUrls = (await Promise.all(
      Array.from(request.urls).map(async (url) => {
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
    console.log('Extracted content URLs:', contentUrls);
    // todo - 过滤已记录的URL
    const existingFlags = request.existingFlags || [];
    contentUrls = contentUrls.filter(url => !existingFlags.includes(url));
    console.log('URLs to scrape:', contentUrls);
    const hostTab = await getHostTab();
    const count = 3
    let index = 0;
    while (index < contentUrls.length) {
      const batchUrls = contentUrls.slice(index, index + count);
      Promise.all(batchUrls.map(async (url) => {
        const targetTab = await redirectToTargetTab(url);
        const records = await scraping(targetTab);
        if (records.length > 0) {
          await chrome.tabs.remove(targetTab.id);
          await chrome.tabs.sendMessage(hostTab.id, {
            action: "RECEIVE_FROM_EXTENSION",
            payload: {
              type: "STORE_ARTICLE",
              records
            }
          });
        }
      }));
      index += count;
      await new Promise(resolve => setTimeout(resolve, 10 * 1000)); // 每10秒处理5个URL，避免过快打开多个标签页
    }
    sendSuccessResponse();
  });
}