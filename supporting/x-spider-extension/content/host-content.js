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
  tweetIDs = e.detail.tweetIDs;

  chrome.runtime.sendMessage({
    action: "MARK_TWEET_RECORDED",
    tweetIDs: tweetIDs,
  });
});

// chrome.runtime.sendMessage({
//   action: "COLLECT_LATEST_TWEETS",
//   // collect_from: e.detail.collect_from,
// });