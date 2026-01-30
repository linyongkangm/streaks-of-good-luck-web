import MessageObserver from './lib/MessageObserver.js';
import { getCurrentTab } from './lib/utils.js';
import { register as registerXWorker } from './x-worker.js';
import { register as registerScrapingWorker } from './scraping-worker.js';
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

registerXWorker(messageObserver);

registerScrapingWorker(messageObserver);