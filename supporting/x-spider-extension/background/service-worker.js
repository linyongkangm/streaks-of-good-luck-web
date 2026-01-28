import MessageObserver from './lib/MessageObserver.js';
import { getCurrentTab } from './lib/utils.js';

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
  }, 0); // 10 seconds timeout
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
  const tabID = tab?.id;
  if (!tabID) {
    sendFailedResponse({}, 'No active tab found');
    return;
  }

  if (isScraping) {
    sendFailedResponse({}, 'Scraping is already started');
    return;
  }
  isScraping = true;
  scraping(tabID);
  sendSuccessResponse({ windowId: tab.windowId });
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
  const tweetIDs = request.tweetIDs;
  const localStorage = await chrome.storage.local.get("recordedTweets");
  const recordedTweets = localStorage.recordedTweets || [];
  await chrome.storage.local.set({ recordedTweets: [...new Set([...recordedTweets, ...tweetIDs])] });
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
  console.log(xTab.status);
});


async function scraping(tabID, onComplete) {
  const second = (await chrome.storage.local.get(["scrapingInterval"])).scrapingInterval || 1000;
  setTimeout(async () => {
    const response = await chrome.tabs.sendMessage(tabID, { action: "SCRAPING" });
    const localStorage = await chrome.storage.local.get(["recordedTweets"]);
    const recordedTweets = localStorage.recordedTweets || [];
    let currentRecordedTweetsCount = 0
    const tweetRecords = response.data.tweetRecords.filter(item => {
      if (recordedTweets.includes(item.tweetID)) {
        currentRecordedTweetsCount += 1;
        return false;
      }
      return true;
    });
    try {
      chrome.runtime.sendMessage({ action: "UPDATE_PREVIEW_TWEET_RECORDS", tweetRecords });
    } catch (error) {
      console.error('Failed to send tweet records to preview:', error);
    }
    if (currentRecordedTweetsCount >= 10) {
      isScraping = false;
    }
    if (isScraping) {
      scraping(tabID, onComplete);
    } else {
      onComplete(tweetRecords)
    }
  }, second);
}



