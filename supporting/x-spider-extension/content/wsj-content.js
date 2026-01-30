console.log('X-Spider wsj-content script');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in wsj-content script:', request.action, request);
  if (request.action === "SCRAPING") {
    const scrollY = window.scrollY;
    window.scrollTo(0, document.body.scrollHeight);
    setTimeout(() => {
      const title = document.querySelector('.article-container .article-header h1').textContent;
      const source_url = window.location.href;
      const publication = 'wsj';
      const issue_date = document?.querySelector?.('.article-container article time')?.getAttribute('datetime')?.split('T')?.[0];
      const contributor = document.querySelector('.article-container article [data-testid="author-link"]').textContent;
      const source_text = document.querySelector('.article-container article section').textContent;
      const record = { title, source_url, publication, issue_date, contributor, source_text }
      console.log(record);
      window.scrollTo(0, scrollY);
      sendResponse({ success: true, data: { records: [record] } });
      chrome.runtime.sendMessage({ action: "STOP_SCRAPING" });
    }, 1000);
  }
  return true;
});