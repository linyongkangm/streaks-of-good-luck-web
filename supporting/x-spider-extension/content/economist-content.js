console.log('X-Spider economist-content script');

async function scrape() {
  const scrollY = window.scrollY;
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待页面加载
  const title = document.title;
  const source_url = window.location.origin + window.location.pathname;
  const publication = 'The Economist';

  const articleContainer = document.querySelector('#new-article-template');
  if (!articleContainer) {
    throw new Error('Article container not found');
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
  return [record]
}

