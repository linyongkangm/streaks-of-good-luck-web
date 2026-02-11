document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getCurrentTab();
  const reloadBtn = document.getElementById('reloadBtn');
  reloadBtn.addEventListener('click', () => {
    const messageData = { action: "RELOAD_EXTENSION" };
    chrome.runtime.sendMessage(messageData);
  });

  await updateScrapingButton();
  const scrapingBtn = document.getElementById('ScrapingBtn');
  scrapingBtn.addEventListener('click', async () => {
    const isScraping = await getIsScraping(tab);
    if (isScraping) {
      await updateScrapingButton(false);
      await setIsScraping(tab, false);
    } else {
      await updateScrapingButton(true);
      const resp = await chrome.runtime.sendMessage({ action: "CURRENT_TAB_SCRAPING" });
      await updateScrapingButton();
      console.log('Scraping records:', resp.data.records);
      await chrome.runtime.sendMessage({
        action: "SEND_TO_HOST",
        payload: {
          type: "STORE_ARTICLE",
          records: resp.data.records
        }
      });
    }

  });
});

async function updateScrapingButton(boolean) {
  let isScraping = boolean;
  if (isScraping === undefined) {
    const tab = await getCurrentTab();
    isScraping = await getIsScraping(tab);
    console.log('isScraping status:', isScraping);
  }
  const scrapingBtn = document.getElementById('ScrapingBtn');
  if (isScraping) {
    scrapingBtn.textContent = 'Stop Scraping';
  } else {
    scrapingBtn.textContent = 'Start Scraping';
  }
}

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function getIsScraping(tab) {
  return await chrome.tabs.sendMessage(tab.id, { action: "GET_IS_SCRAPING" }).then(response => response?.data?.isScraping);
}

async function setIsScraping(tab, isScraping) {
  await chrome.tabs.sendMessage(tab.id, { action: "SET_IS_SCRAPING", data: { isScraping } });
}