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

export function callXSpider(action: string, detail: any) {
  return new Promise((resolve, reject) => {
    const callbackCode = `CALLBACK_${action}_` + Math.random().toString(36).substring(2)
    document.addEventListener(callbackCode, async (event: any) => {
      console.log(`${action} result received:`, event.detail);
      resolve(event.detail);
    }, { once: true })
    console.log(`Dispatching ${action} with detail:`, detail);
    document.dispatchEvent(new CustomEvent(action, {
      detail: {
        ...detail,
        callbackCode,
      }
    }))
  });
}

export async function collectLatestTweets(collectFrom: string) {
  const response = await fetch(`/api/tweet-summaries/existing?collect_from=${collectFrom}`);
  const data = await response.json();
  const existingTweetIds: string[] = data.existingTweetIds || [];
  const callXSpiderResult: any = await callXSpider('REDIRECT_TAB_SCRAPING', {
    target: collectFrom,
    existingFlags: existingTweetIds,
  });
  const records = callXSpiderResult.records || []
  if (records && records.length > 0) {
    try {
      const response = await fetch('/api/batch-create-tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetRecords: records }),
      })
      const data = await response.json()

      if (data.success) {
        return (data)
      } else {
        throw new Error(data.message || 'Batch create tweets failed')
      }
    } catch (error) {
      console.error('Failed to batch create tweets:', error)
      throw error
    }
  } else {
    console.log('No new tweets to process.')
    return { success: true, successful: 0, failed: 0 }
  }
}

export async function collectLatestQIUSHIArticles() {
  const qiushiUrls = ['https://www.qstheory.cn/20251231/2d916da295774130ac2fb223fd208895/c.html']; // 每年一个链接
  const response = await fetch('/api/article-summaries/existing?publication=求是');
  const data = await response.json();
  const existingSourceUrls: string[] = data.existingSourceUrls || [];
  await callXSpider('BATCH_LIST_SCRAPING', {
    urls: qiushiUrls,
    existingFlags: existingSourceUrls,
  });
}

export async function collectLatestWSJArticles() {
  const listUrls = new Set([
    "https://www.wsj.com/finance?page=1",
    "https://www.wsj.com/finance/commodities-futures?page=1",
    "https://www.wsj.com/finance/banking?page=1",
    "https://www.wsj.com/finance/currencies?page=1",
    "https://www.wsj.com/finance/investing?page=1",
    "https://www.wsj.com/finance/regulation?page=1",
    "https://www.wsj.com/finance/stocks?page=1",
    "https://www.wsj.com/tech?page=1",
    "https://www.wsj.com/tech/ai?page=1",
    "https://www.wsj.com/tech/biotech?page=1",
    "https://www.wsj.com/tech/personal-tech?page=1",
    "https://www.wsj.com/economy?page=1",
    "https://www.wsj.com/economy/central-banking?page=1",
    "https://www.wsj.com/economy/trade?page=1",
    "https://www.wsj.com/economy/global?page=1",
    "https://www.wsj.com/world/china?page=1",
    "https://www.wsj.com/world?page=1",
    "https://www.wsj.com/politics?page=1"
    
  ]);
  const response = await fetch('/api/article-summaries/existing?publication=wsj')
  const data = await response.json();
  const existingSourceUrls: string[] = data.existingSourceUrls || [];
  await callXSpider('BATCH_LIST_SCRAPING', {
    urls: Array.from(listUrls),
    existingFlags: existingSourceUrls,
  });
}

export async function collectLatestEconomistArticles() {
  const listUrl = [
    'https://www.economist.com/weeklyedition/'
  ];
  const response = await fetch('/api/article-summaries/existing?publication=The Economist');
  const data = await response.json();
  const existingSourceUrls: string[] = data.existingSourceUrls || [];
  await callXSpider('BATCH_LIST_SCRAPING', {
    urls: listUrl,
    existingFlags: existingSourceUrls,
  });
}