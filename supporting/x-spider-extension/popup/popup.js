document.addEventListener('DOMContentLoaded', async () => {
  const reloadBtn = document.getElementById('reloadBtn');
  reloadBtn.addEventListener('click', () => {
    const messageData = { action: "RELOAD_EXTENSION" };
    chrome.runtime.sendMessage(messageData);
  });

  document.getElementById('stopScrapingBtn').addEventListener('click', () => {
    const messageData = { action: "STOP_SCRAPING" };
    chrome.runtime.sendMessage(messageData);
  });
});
