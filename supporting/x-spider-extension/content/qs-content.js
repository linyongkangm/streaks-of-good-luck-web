console.log('X-Spider qs-content script');

async function scrapeList() {
  const contents = [...document.querySelectorAll("#detailContent a")];
  contents.pop(); // Remove the last element
  const contentArticleUrls = await Promise.all(contents.map((content, index) => {
    return new Promise((resolve) => {
      const contentIframe = document.createElement("iframe");
      contentIframe.src = content.href.replace('http://', 'https://');
      contentIframe.onload = () => {
        const contentDocument = contentIframe.contentWindow.document;
        const aElements = [...contentDocument.querySelectorAll("#detailContent a")];
        aElements.shift(); // Remove the first element
        if (aElements[0].textContent.includes('本期导读')) {
          aElements.shift(); // Remove '本期导读' link if present
        }
        aElements.pop(); // Remove '查看往期' link if present
        if (aElements) {
          const articleUrls = [];
          aElements.forEach(aElement => {
            const source_url = aElement.href;
            articleUrls.push(source_url);
          });
          resolve(articleUrls);
        } else {
          resolve([]);
        }
        contentIframe.remove();
      };
      setTimeout(() => {
        if (contentIframe.parentElement == null) return;
        console.warn('Timeout loading content iframe for URL:', content.href);
        resolve([]);
        contentIframe.remove();
      }, 30000); // 30 seconds timeout
      document.body.appendChild(contentIframe);
    });
  }));
  const urls = [...new Set(contentArticleUrls.flat())];
  return urls;
}

async function scrape() {
  const scrollY = window.scrollY;
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待页面加载
  const content = document.querySelector('.content');
  const title = content.querySelector('h1').textContent + content.querySelector('h2').textContent;
  const issueDate = new Date(content.querySelector('.pubtime').textContent)
  const issue_date = issueDate.toISOString().split('T')[0];
  const contributor = content.querySelector('.appellation:nth-child(2)')?.textContent || '';
  const detailElement = content.querySelector("#detail");
  const source_text = detailElement ? detailElement.textContent.trim() : '';
  const source_url = window.location.origin + window.location.pathname;
  const publication = '求是';
  const record = {
    title,
    issue_date,
    contributor,
    source_text,
    source_url,
    publication,
  }
  console.log(record);
  window.scrollTo(0, scrollY);
  return [record];
}