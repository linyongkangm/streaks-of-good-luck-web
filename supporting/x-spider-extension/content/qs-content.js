console.log('X-Spider qs-content script');

window.addEventListener('beforeunload', function (e) {
  chrome.runtime.sendMessage({ action: "STOP_SCRAPING" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in qs-content script:', request.action, request);
  (async () => {
    if (request.action === "SCRAPING") {
      const scrapingRecorded = (await chrome.runtime.sendMessage({
        action: "GET_RECORDED_SCRAPINGS",
        host: 'https://www.qstheory.cn'
      }))?.data?.recordedScrapings || [];
      const contents = [...document.querySelectorAll("#detailContent a")];
      contents.pop(); // Remove the last element
      const contentArticles = await Promise.all(contents.map(content => {
        return new Promise((resolve) => {
          const contentIframe = document.createElement("iframe");
          contentIframe.src = content.href;
          contentIframe.onload = () => {
            const contentDocument = contentIframe.contentWindow.document;
            const issueDate = new Date(contentDocument.querySelector('.pubtime').textContent);
            const aElements = [...contentDocument.querySelectorAll("#detailContent a")];
            aElements.pop(); // Remove the last element
            aElements.shift(); // Remove the first element
            if (aElements) {
              const articles = [];
              aElements.forEach(aElement => {
                const source_url = aElement.href;
                if (scrapingRecorded.includes(source_url)) {
                  return;
                }
                const exitingArticle = articles.find(article => article.source_url === source_url);
                if (exitingArticle) {
                  exitingArticle.title += ` ${aElement.textContent}`;
                } else {
                  const spans = [...aElement.closest('p')?.querySelectorAll('span:last-child')] || [];
                  let contributor = spans.at(-1)?.textContent || '';
                  if (contributor.startsWith('/')) {
                    contributor = contributor.slice(1, -1);
                  }
                  articles.push({
                    source_url: source_url,
                    title: aElement.textContent,
                    contributor,
                    publication: "求是",
                    issue_date: issueDate.toISOString().split('T')[0],
                  });
                }
              });
              console.log(content.textContent, 'Extracted articles:', articles);
              resolve(articles);
            } else {
              resolve([]);
            }
            contentIframe.remove();
          };
          document.body.appendChild(contentIframe);
        });
      }));
      const articles = contentArticles.flat();
      console.log('Final extracted articles:', articles);

      await Promise.all(articles.map(article => {
        return new Promise((resolve) => {
          const articleIframe = document.createElement("iframe");
          articleIframe.src = article.source_url;
          articleIframe.onload = () => {
            const articleDocument = articleIframe.contentWindow.document;
            const detailElement = articleDocument.querySelector("#detail");
            if (detailElement) {
              article.source_text = detailElement.textContent.trim();
            } else {
              console.warn('Detail element not found for article:', article.source_url);
            }
            resolve();
            articleIframe.remove();
          };
          document.body.appendChild(articleIframe);
        });
      }));
      console.log('Articles with source text:', articles);
      sendResponse({ success: true, data: { records: articles } });
      chrome.runtime.sendMessage({ action: "STOP_SCRAPING" });
    }
  })();
  return true; // Keep the message channel open for sendResponse
});