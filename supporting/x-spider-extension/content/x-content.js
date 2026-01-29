// Content Script
console.log('X-Spider x-content script');
const tweetRecords = new Map()

window.addEventListener('beforeunload', function (e) {
  chrome.runtime.sendMessage({ action: "STOP_SCRAPING" });
});

// Example: Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in x-content script:', request.action, request);
  if (request.action === "SCRAPING") {
    scraping(tweetRecords)
    sendResponse({ success: true, data: { records: Array.from(tweetRecords.values()) } });
  }
});

function scraping(tweetRecords) {
  window.scrollTo({
    top: window.scrollY + 1000,    // 必选：垂直滚动距离（核心，向下滑改此值）
    behavior: 'smooth' // 可选：滚动行为，'smooth'=平滑滚动，'auto'=瞬间跳转（默认）
  });
  const tweets = document.querySelectorAll('[data-testid="cellInnerDiv"] [data-testid="tweet"]');
  tweets.forEach((tweet) => {
    try {
      if (!tweet.querySelector('[data-testid="User-Name"]>div:last-child a time')) {
        return
      }
      const tweetID = tweet.querySelector('[data-testid="User-Name"]>div:last-child a time').parentNode.getAttribute('href').split("/").pop();
      if (tweetRecords.has(tweetID)) {
        return;
      }
      console.log(tweet)
      const userName = tweet.querySelector('[data-testid="User-Name"]>div:last-child a span').textContent;
      const tweetDate = tweet.querySelector('[data-testid="User-Name"]>div:last-child a time').getAttribute('datetime');
      const tweetText = tweet.querySelector('[data-testid="tweetText"]')?.textContent || "";
      const replyCount = tweet.querySelector('button[data-testid="reply"]').textContent;
      const retweetCount = tweet.querySelector('button[data-testid="retweet"]').textContent;
      const likeCount = tweet.querySelector('button[data-testid="like"]').textContent;
      const viewCount = tweet.querySelector('button[data-testid="like"]')?.parentNode?.nextSibling?.textContent;
      const collectFrom = location.href
      const tweetUrl = `${collectFrom}/status/${tweetID}`
      const isQuote = tweet.querySelector('[data-testid="tweetText"]')?.parentNode?.nextSibling?.textContent.includes("引用") || false;
      const isRetweet = tweet.querySelector('[data-testid="socialContext"]')?.textContent.includes("已转帖") || false;
      const tweetFrom = isRetweet ? "Retweet" : isQuote ? "Quote" : "OriginalPost"

      const record = {
        tweetID,
        userName,
        tweetDate,
        tweetText,
        replyCount,
        retweetCount,
        likeCount,
        viewCount,
        tweetUrl,
        tweetFrom,
        collectFrom
      }
      console.log(record)
      tweetRecords.set(tweetID, record);
    } catch (error) {
      console.log(tweet)
      console.error('Error processing tweet:', error);
      chrome.runtime.sendMessage({ action: "ERROR_PROCESSING_TWEET" });
    }
  })
}
