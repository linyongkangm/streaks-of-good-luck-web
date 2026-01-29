console.log('X-Spider host-content script');

document.addEventListener('REDIRECT_SCRAPING', async function (e) {
  console.log('Custom event received in host-content script:', "REDIRECT_SCRAPING", e.detail);

  const response = await chrome.runtime.sendMessage({
    action: "REDIRECT_SCRAPING",
    target: e.detail.target,
  });
  if (response.success) {
    document.dispatchEvent(new CustomEvent(e.detail.callbackCode, {
      detail: response.data
    }));
  }
});

document.addEventListener('GET_LATEST_TWEETS', async function (e) {
  console.log('Custom event received in host-content script:', 'GET_LATEST_TWEETS', e.detail);

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
  console.log('Custom event received in host-content script to mark tweets recorded:', 'MARK_TWEET_RECORDED', e.detail);

  chrome.runtime.sendMessage({
    action: "MARK_TWEET_RECORDED",
    tweetIDs: e.detail.tweetIDs,
    collect_from: e.detail.collect_from,
  });
});