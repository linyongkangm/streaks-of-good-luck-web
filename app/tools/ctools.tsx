export async function processArticles(articles: any[]) {
  const response = await fetch('/api/process-articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles }),
  });
  const result = await response.json();
  console.log('Article processing result:', result);
  return result;
}