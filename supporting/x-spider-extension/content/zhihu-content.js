console.log('X-Spider zhihu-content script');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in zhihu-content script:', request.action, request);
  if (request.action === "SCRAPING") {
    const scrollY = window.scrollY;
    window.scrollTo(0, document.body.scrollHeight);
    setTimeout(() => {
      let record = null;
      const source_url = window.location.origin + window.location.pathname;
      const publication = 'zhihu';
      const articleContainer = document.querySelector('article.Post-Main') || document.querySelector('div.QuestionPage');
      if (!articleContainer) {
        sendResponse({ success: false, error: 'Article container not found' });
        chrome.runtime.sendMessage({ action: "STOP_SCRAPING" });
        return;
      }
      const contributor = articleContainer?.querySelector('.AuthorInfo meta[itemprop="name"]')?.getAttribute('content');
      if (source_url.includes('www.zhihu.com/question')) {
        const title = articleContainer?.querySelector('meta[itemprop="name"]')?.getAttribute('content');
        const issue_date = articleContainer?.querySelector('meta[itemprop="dateCreated"]')?.getAttribute('content')?.split('T')?.[0];
        const source_text_element = articleContainer?.querySelector('.RichContent #content');
        cleaningAD(source_text_element);
        const source_text = source_text_element.textContent;
        record = { title, source_url, publication, issue_date, contributor, source_text }
      } else {
        const title = document.querySelector('header.Post-Header h1.Post-Title')?.textContent;
        const issue_date = articleContainer?.querySelector('meta[itemprop="datePublished"]')?.getAttribute('content')?.split('T')?.[0];
        const source_text_element = articleContainer?.querySelector('.Post-RichTextContainer');
        cleaningAD(source_text_element);
        const source_text = source_text_element.textContent;
        record = { title, source_url, publication, issue_date, contributor, source_text }
      }
      if (!record.issue_date) { record.issue_date = (new Date()).toISOString().split('T')[0]; }
      console.log(record);
      window.scrollTo(0, scrollY);
      sendResponse({ success: true, data: { records: [record] } });
      chrome.runtime.sendMessage({ action: "STOP_SCRAPING" });
    }, 1000);
  }
  return true;
});

function cleaningAD(element) {
  const scriptElements = element.querySelectorAll('script, style');
  scriptElements.forEach(el => el.remove());
}