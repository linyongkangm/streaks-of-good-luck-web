
export async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

export async function getHostTab() {
  let hostTab = (await chrome.tabs.query({
    url: 'http://localhost:3001/*'
  }))?.[0];
  if (!hostTab) {
    hostTab = (await chrome.tabs.query({
      url: 'http://localhost:3000/*'
    }))?.[0];
  }
  return hostTab;
}


export async function redirectToTargetTab(url) {
  let targetTab = (await chrome.tabs.query({
    url: url
  }))[0];
  if (!targetTab) {
    targetTab = await chrome.tabs.create({ url: url });
  }
  await chrome.tabs.update(targetTab.id, { active: true });
  do {
    targetTab = (await chrome.tabs.query({ url: url }))[0];
    await new Promise(resolve => setTimeout(resolve, 500));
  } while (targetTab.status !== 'complete');
  console.log("Redirected to target tab:", targetTab);
  return targetTab;
}