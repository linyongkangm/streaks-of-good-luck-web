export async function processArticles(articles: any[]) {
  const response = await fetch('/api/process-articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles }),
  });
  const result = await response.json();
  console.log('Article processing result:', result);
  return result;
}

export function collectLatestTweets(collectFrom: String) {
  return new Promise<any>((resolve, reject) => {
    const callbackCode = 'CALLBACK_REDIRECT_TAB_SCRAPING_' + Math.random().toString(36).substring(2)
    document.addEventListener(callbackCode, async (event: any) => {
      // tweetRecords结构示例
      // [{
      //     "tweetID": "2015568895512629468",
      //     "userName": "@XFreeze",
      //     "tweetDate": "2026-01-25T23:34:06.000Z",
      //     "tweetText": "ELON MUSK: MAKE LIFE MULTI-PLANETARY WITH THE KEY THRESHOLD TO SUSTAIN EVEN WITHOUT SUPPLY SHIPS FROM EARTH\n\n\"The goal is to make life multi-planetary. The key threshold for that is if the supply ships from Earth stop coming for any reason, Mars does not die out\n\nThat is the",
      //     "replyCount": "549",
      //     "retweetCount": "785",
      //     "likeCount": "3,704",
      //     "viewCount": "61万",
      //     "tweetUrl": "https://x.com/elonmusk/status/2015568895512629468",
      //     "tweetFrom": "Retweet",
      //     "collectFrom": "https://x.com/elonmusk"
      // }]
      console.log('Latest tweets fetched:', event.detail.records);
      const records = event.detail.records;
      // 批量创建推文
      if (records && records.length > 0) {
        try {
          const response = await fetch('/api/batch-create-tweets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tweetRecords: records }),
          })
          const data = await response.json()

          if (data.success) {
            // 刷新摘要列表
            document.dispatchEvent(new CustomEvent('MARK_RECORDED_SCRAPINGS', {
              detail: {
                flags: (data.successfulTweetIds || []).concat(data.existingTweetIds || []),
                host: collectFrom,
              }
            }))
            resolve(data)
          } else {
            throw new Error(data.message || 'Batch create tweets failed')
          }
        } catch (error) {
          console.error('Failed to batch create tweets:', error)
          reject(error)
        }
      } else {
        console.log('No new tweets to process.')
        resolve({ success: true, successful: 0, failed: 0 })
      }
    }, { once: true });
    document.dispatchEvent(new CustomEvent('REDIRECT_TAB_SCRAPING', {
      detail: {
        target: collectFrom,
        callbackCode
      }
    }))
  });
}