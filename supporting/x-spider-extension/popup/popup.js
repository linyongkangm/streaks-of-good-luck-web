document.addEventListener('DOMContentLoaded', async () => {
  const reloadBtn = document.getElementById('reloadBtn');
  reloadBtn.addEventListener('click', () => {
    const messageData = { action: "RELOAD_EXTENSION" };
    chrome.runtime.sendMessage(messageData);
  });

  await updateScrapingButton();
  const scrapingBtn = document.getElementById('ScrapingBtn');
  scrapingBtn.addEventListener('click', async () => {
    const resp = await chrome.runtime.sendMessage({ action: "GET_IS_SCRAPING" });
    if (resp.data.isScraping) {
      const messageData = { action: "STOP_SCRAPING" };
      await chrome.runtime.sendMessage(messageData);
    } else {
      const messageData = { action: "SCRAPING" };
      const resp = await chrome.runtime.sendMessage(messageData);
      console.log('Scraping started:', resp.data.records);
      const sendToHostMessage = {
        action: "SEND_TO_HOST",
        payload: {
          type: "STORE_ARTICLE",
          records: resp.data.records
        }
      };
      await chrome.runtime.sendMessage(sendToHostMessage);
    }
    await updateScrapingButton();
  });
});

async function updateScrapingButton() {
  const resp = await chrome.runtime.sendMessage({ action: "GET_IS_SCRAPING" });
  const scrapingBtn = document.getElementById('ScrapingBtn');
  if (resp.data.isScraping) {
    scrapingBtn.textContent = 'Stop Scraping';
  } else {
    scrapingBtn.textContent = 'Start Scraping';
  }
}