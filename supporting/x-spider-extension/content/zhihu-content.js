console.log('X-Spider zhihu-content script');

async function scrape() {
  const scrollY = window.scrollY;
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待页面加载
  let record = null;
  const source_url = window.location.origin + window.location.pathname;
  const publication = 'zhihu';
  const articleContainer = document.querySelector('article.Post-Main') || document.querySelector('div.QuestionPage');
  if (!articleContainer) {
    throw new Error('Article container not found');
  }
  const contributor = articleContainer?.querySelector('.AuthorInfo meta[itemprop="name"]')?.getAttribute('content');
  if (source_url.includes('www.zhihu.com/question')) {
    const title = articleContainer?.querySelector('meta[itemprop="name"]')?.getAttribute('content');
    const issue_date = articleContainer?.querySelector('.AnswerCard meta[itemprop="dateCreated"]')?.getAttribute('content')?.split('T')?.[0];
    const source_text_element = articleContainer?.querySelector('.AnswerCard .RichContent #content');
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
  return [record];
}
