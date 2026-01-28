document.addEventListener('DOMContentLoaded', async () => {
  const reloadBtn = document.getElementById('reloadBtn');
  reloadBtn.addEventListener('click', () => {
    const messageData = { action: "RELOAD_EXTENSION" };
    chrome.runtime.sendMessage(messageData);
  });
});
