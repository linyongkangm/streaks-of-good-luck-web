console.log('X-Spider wsj-content script');

async function scrapeList() {
  const scrollY = window.scrollY;
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待页面加载
  let urls = Array.from(document.querySelectorAll('[data-testid="content-feed"] a')).map(a => {
    const url = new URL(a.href, window.location.origin);
    return url.origin + url.pathname;
  }).filter(url => !url.includes('https://www.wsj.com/news/author'));
  urls = [...new Set(urls)];
  console.log('Scraped URLs:', urls);
  window.scrollTo(0, scrollY);
  return urls;
}

async function scrape() {
  const scrollY = window.scrollY;
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待页面加载
  const header = document.querySelector('.article-container .article-header h1') ||
    document.querySelector('.bigTop h1') ||
    { textContent: document.title.replace(' - WSJ', '') };
  const title = header.textContent;
  const source_url = window.location.origin + window.location.pathname;
  const publication = 'wsj';
  const articleContainer = document.querySelector('.article-container') || document.querySelector('#__next main');
  if (!articleContainer) {
    throw new Error('Article container not found');
  }
  let issue_date = articleContainer?.querySelector('article time')?.getAttribute('datetime')?.split('T')?.[0];
  if (!issue_date) {
    const now = new Date();
    issue_date = now.toISOString().split('T')[0];
  }
  const contributor = articleContainer?.querySelector('article [data-testid="author-link"]')?.textContent;
  const source_text_element = articleContainer?.querySelector('article section')
  cleaningAD(source_text_element);
  const source_text = source_text_element.textContent;
  const record = { title, source_url, publication, issue_date, contributor, source_text }
  console.log(record);
  window.scrollTo(0, scrollY);
  return [record];
}
