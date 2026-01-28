console.log('X-Spider host-content script');

document.addEventListener('GET_LATEST_TWEETS', async function (e) {
  console.log('Custom event received in host-content script:', e.detail);

  const response = await chrome.runtime.sendMessage({
    action: "COLLECT_LATEST_TWEETS",
    collect_from: e.detail.collect_from,
  });
  if (response.success) {
    document.dispatchEvent(new CustomEvent(e.detail.callbackCode, {
      detail: response.data
    }));
  }
});

document.addEventListener('MARK_TWEET_RECORDED', function (e) {
  console.log('Custom event received in host-content script to mark tweets recorded:', e.detail);

  chrome.runtime.sendMessage({
    action: "MARK_TWEET_RECORDED",
    tweetIDs: e.detail.tweetIDs,
    collect_from: e.detail.collect_from,
  });
});

// (async function () {
//   const collect_from = 'https://x.com/elonmusk';
//   const response = await chrome.runtime.sendMessage({
//     action: "COLLECT_LATEST_TWEETS",
//     collect_from,
//   });
//   chrome.runtime.sendMessage({
//     action: "MARK_TWEET_RECORDED",
//     tweetIDs: response.data.records.map(record => record.tweetID),
//     collect_from: collect_from,
//   });
//   console.log('Initial tweet collection response in host-content script:', response);
// })()
