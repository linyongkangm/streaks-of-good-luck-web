import MessageObserver from './lib/MessageObserver.js';
import { getCurrentTab } from './lib/utils.js';
import { scraping, xScraping, markTweetRecorded } from './lib/scraping.js';
// Background Service Worker
const messageObserver = new MessageObserver();

chrome.runtime.onInstalled.addListener(() => {
  console.log('X-Spider Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request.action, request);
  const sendSuccessResponse = async (data = {}, message) => await sendResponse({ success: true, data, message });
  const sendFailedResponse = async (data = {}, message) => await sendResponse({ success: false, data, message });
  setTimeout(() => {
    messageObserver.emit(request.action, request, sender, sendSuccessResponse, sendFailedResponse);
  }, 0);
  return true; // Keep the message channel open for async response
});

messageObserver.on("RELOAD_EXTENSION", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
  sendSuccessResponse();
  const tab = await getCurrentTab();
  chrome.tabs.sendMessage(tab?.id, { action: "RELOAD" });
  chrome.runtime.reload();
});


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
  const records = scraping(tab);
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

messageObserver.on("MARK_TWEET_RECORDED", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
  await markTweetRecorded(request.collect_from, request.tweetIDs);
  sendSuccessResponse();
});

messageObserver.on("COLLECT_LATEST_TWEETS", async (request, sender, sendSuccessResponse, sendFailedResponse) => {
  let xTab = (await chrome.tabs.query({
    url: request.collect_from + '*'
  }))[0];
  if (!xTab) {
    xTab = await chrome.tabs.create({ url: request.collect_from });
  }
  await chrome.tabs.update(xTab.id, { active: true });
  do {
    xTab = (await chrome.tabs.query({ url: request.collect_from }))[0];
    await new Promise(resolve => setTimeout(resolve, 500));
  } while (xTab.status !== 'complete');

  isScraping = true;
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
  isScraping = false;
  console.log("Scraping completed.", xScraper.getCacheRecords());
  sendSuccessResponse({ records: xScraper.getCacheRecords() });
  await chrome.tabs.update(sender.tab.id, { active: true });
});



