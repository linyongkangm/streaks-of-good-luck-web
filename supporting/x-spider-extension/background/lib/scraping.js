export async function scraping(tab, existingFlags) {
  const response = await chrome.tabs.sendMessage(tab.id, { action: "SCRAPING", existingFlags });
  return response?.data?.records || [];
}

const RECORDED_SCRAPINGS_KEY = 'RecordedScrapings';
export async function getRecordedScrapings(host) {
  const hostKey = RECORDED_SCRAPINGS_KEY + '_' + host;
  const localStorage = await chrome.storage.local.get(hostKey);
  const recordedScrapings = localStorage[hostKey] || [];
  return recordedScrapings
}

export async function markRecordedScrapings(host, flags) {
  const hostKey = RECORDED_SCRAPINGS_KEY + '_' + host;
  const recordedScrapings = await getRecordedScrapings(host);
  await chrome.storage.local.set({
    [hostKey]: [...new Set([...recordedScrapings, ...flags])].slice(-200)
  });
}

