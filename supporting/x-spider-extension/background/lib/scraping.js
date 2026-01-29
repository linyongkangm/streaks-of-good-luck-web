export async function scraping(tab) {
  const response = await chrome.tabs.sendMessage(tab.id, { action: "SCRAPING" });
  return response?.data?.records || [];
}

const RECORDED_SCRAPINGS_KEY = 'RecordedScrapings';
export async function getRecordedScrapings(host) {
  const hostKey = RECORDED_SCRAPINGS_KEY + '_' + host;
  const localStorage = await chrome.storage.local.get(hostKey);
  const recordedScrapings = localStorage[hostKey] || [];
  return recordedScrapings
}

export async function markRecordedScrapings(host, flags) {
  const hostKey = RECORDED_SCRAPINGS_KEY + '_' + host;
  const recordedScrapings = await getRecordedScrapings(host);
  await chrome.storage.local.set({
    [hostKey]: [...new Set([...recordedScrapings, ...flags])].slice(-200)
  });
}


export async function xScraping(tab) {
  let running = true;
  let cacheRecords = [];
  (async function scrapeLoop() {
    while (running) {
      const recordedTweets = await getRecordedScrapings(tab.url);
      const records = await scraping(tab);
      cacheRecords = records.filter(item => !recordedTweets.includes(item.tweetID));
      const localStorage = await chrome.storage.local.get(["XScrapingInterval", "XScrapingRecordedLimit"]);
      console.log(`XScraping: 已抓取 ${records.length} 条，去重后 ${cacheRecords.length} 条`);
      if (records.length - cacheRecords.length >= (localStorage.XScrapingRecordedLimit || 20)) {
        running = false;
      }
      const mSecond = Number(localStorage.XScrapingInterval || 1000);
      await new Promise(resolve => setTimeout(resolve, mSecond));
    }
  })();
  return {
    getRunning: function () {
      return running;
    },
    getCacheRecords: function () {
      return cacheRecords;
    },
    stopScraping() {
      running = false;
      return cacheRecords
    },
  }
}
