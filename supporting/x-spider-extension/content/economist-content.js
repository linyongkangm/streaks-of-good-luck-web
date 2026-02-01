console.log('X-Spider economist-content script');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in economist-content script:', request.action, request);
  if (request.action === "SCRAPING") {
    const scrollY = window.scrollY;
    window.scrollTo(0, document.body.scrollHeight);
    setTimeout(() => {
      const title = document.title;
      const source_url = window.location.origin + window.location.pathname;
      const publication = 'The Economist';

      const articleContainer = document.querySelector('#new-article-template');
      if (!articleContainer) {
        sendResponse({ success: false, error: 'Article container not found' });
        chrome.runtime.sendMessage({ action: "STOP_SCRAPING" });
        return;
      }
      let issue_date = articleContainer?.querySelector('time')?.getAttribute('datetime')?.split('T')?.[0];
      if (!issue_date) { issue_date = (new Date()).toISOString().split('T')[0]; }
      const contributor = undefined;
      const source_text_elements = articleContainer?.querySelectorAll('section');
      const source_text_element = source_text_elements.item(source_text_elements.length - 1);
      cleaningAD(source_text_element);
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

function cleaningAD(element) {
  const scriptElements = element.querySelectorAll('script, style, audio, video');
  scriptElements.forEach(el => el.remove());
}