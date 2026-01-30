import { xScraping } from './lib/scraping.js';

export function register(messageObserver) {
  messageObserver.on("COLLECT_LATEST_TWEETS", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
    let xTab = (await chrome.tabs.query({
      url: request.collect_from
    }))[0];
    if (!xTab) {
      xTab = await chrome.tabs.create({ url: request.collect_from });
    }
    await chrome.tabs.update(xTab.id, { active: true });
    do {
      xTab = (await chrome.tabs.query({ url: request.collect_from }))[0];
      await new Promise(resolve => setTimeout(resolve, 500));
    } while (xTab.status !== 'complete');
    await messageObserver.emit("SET_IS_SCRAPING", { isScraping: true }, sender, () => { }, () => { });

    const xScraper = await xScraping(xTab);
    messageObserver.once("STOP_SCRAPING", () => {
      if (xScraper.getRunning()) {
        xScraper.stopScraping();
      }
    });
    while (xScraper.getRunning()) {
      console.log("Scraping in progress...", xScraper.getCacheRecords());
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await messageObserver.emit("SET_IS_SCRAPING", { isScraping: false }, sender, () => { }, () => { });
    console.log("Scraping completed.", xScraper.getCacheRecords());
    sendSuccessResponse({ records: xScraper.getCacheRecords() });
    await chrome.tabs.update(sender.tab.id, { active: true });
  });
}