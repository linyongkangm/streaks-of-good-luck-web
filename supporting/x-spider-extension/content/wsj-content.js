console.log('X-Spider wsj-content script');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in wsj-content script:', request.action, request);
  if (request.action === "SCRAPING") {
    const scrollY = window.scrollY;
    window.scrollTo(0, document.body.scrollHeight);
    setTimeout(() => {
      let header = document.querySelector('.article-container .article-header h1')
      if (!header) {
        header = document.querySelector('.bigTop h1');
      }
      const title = header.textContent;
      const source_url = window.location.origin + window.location.pathname;
      const publication = 'wsj';
      const articleContainer = document.querySelector('.article-container') || document.querySelector('#__next main');
      if (!articleContainer) {
        sendResponse({ success: false, error: 'Article container not found' });
        chrome.runtime.sendMessage({ action: "STOP_SCRAPING" });
        return;
      }
      let issue_date = articleContainer?.querySelector('article time')?.getAttribute('datetime')?.split('T')?.[0];
      if (!issue_date) {
        const now = new Date();
        issue_date = now.toISOString().split('T')[0];
      }
      const contributor = articleContainer?.querySelector('article [data-testid="author-link"]')?.textContent;
      const source_text_element = articleContainer?.querySelector('article section')
      const scriptElements = source_text_element.querySelectorAll('script, style');
      scriptElements.forEach(el => el.remove());
      const source_text = source_text_element.textContent;
      const record = { title, source_url, publication, issue_date, contributor, source_text }
      console.log(record);
      window.scrollTo(0, scrollY);
      sendResponse({ success: true, data: { records: [record] } });
      chrome.runtime.sendMessage({ action: "STOP_SCRAPING" });
    }, 1000);
  }
  return true;
});