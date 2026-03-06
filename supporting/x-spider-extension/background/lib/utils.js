
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
    targetTab = await chrome.tabs.create({ url: url, active: false });
  }
  let i = 0;
  do {
    await new Promise(resolve => setTimeout(resolve, 1000));
    targetTab = await chrome.tabs.get(targetTab.id);
    console.log("Checking target tab status:", targetTab.url, targetTab.status, i);
  } while (targetTab.status !== 'complete' && i++ < 60);
  console.log("Redirected to target tab:", targetTab.url, targetTab, i);
  return targetTab;
}

export async function getIsScraping(tab) {
  return await chrome.tabs.sendMessage(tab.id, { action: "GET_IS_SCRAPING" }).then(response => response?.data?.isScraping);
}

export async function setIsScraping(tab, isScraping) {
  await chrome.tabs.sendMessage(tab.id, { action: "SET_IS_SCRAPING", data: { isScraping } });
}