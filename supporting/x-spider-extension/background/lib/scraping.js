export async function scraping(tab) {
  const response = await chrome.tabs.sendMessage(tab.id, { action: "SCRAPING" });
  return response?.data?.records || [];
}

export async function xScraping(tab) {
  let running = true;
  let cacheRecords = [];
  (async function scrapeLoop() {
    while (running) {
      const recordedTweets = await getRecordedTweets(tab.url);
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

export async function getRecordedTweets(url) {
  const localStorage = await chrome.storage.local.get("RecordedTweets");
  const recordedTweets = localStorage.RecordedTweets?.[url] || [];
  return recordedTweets
}

export async function markTweetRecorded(url, tweetIDs) {
  const localStorage = await chrome.storage.local.get("RecordedTweets");
  const recordedTweets = localStorage.RecordedTweets?.[url] || [];
  await chrome.storage.local.set({
    RecordedTweets: {
      ...localStorage.RecordedTweets,
      [url]: [...new Set([...recordedTweets, ...tweetIDs])].slice(-200)
    }
  });
}
