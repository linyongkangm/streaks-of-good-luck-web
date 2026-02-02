import { useEffect, useState } from "react";

export type ArticleProcessResult = {
  title: string;
  status: string;
  source_url: string;
};
export default function useStoreArticle() {
  // Placeholder for future article storage logic
  const [articleResults, setArticleResults] = useState<ArticleProcessResult[]>([]);
  const [showArticlePopup, setShowArticlePopup] = useState(false);
  useEffect(() => {
    console.log('Setting up spider event listener');
    const handler = async (e: Event) => {
      console.log('spider event received:', e);
      const detail = (e as CustomEvent).detail;
      setShowArticlePopup(true);
      // Set initial status to '处理中...'
      const initialResults: ArticleProcessResult[] = detail.records.map((rec: any) => ({
        title: rec.title || '无标题',
        status: '处理中...',
        source_url: rec.source_url,
      }));
      setArticleResults((preResults) => {
        return preResults.concat(initialResults);
      });
      try {
        const response = await fetch('/api/process-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articles: detail.records }),
        });
        const result = await response.json();
        console.log('Article processing result:', result);
        initialResults.forEach((item) => {
          item.status = '处理失败';
        });
        const successfulSourceUrls = result.successfulSourceUrls || [];
        const existingSourceUrls = result.existingSourceUrls || [];
        initialResults.forEach((item) => {
          if (successfulSourceUrls.includes(item.source_url)) {
            item.status = '处理完成';
          } else if (existingSourceUrls.includes(item.source_url)) {
            item.status = '已存在，无需处理';
          }
        });
      } catch (err) {
        initialResults.forEach((item) => {
          item.status = '处理失败';
        });
      }
      setArticleResults((preResults) => [...preResults]);
    };
    document.addEventListener('STORE_ARTICLE', handler);
    return () => document.removeEventListener('STORE_ARTICLE', handler);
  }, []);
  return { articleResults, showArticlePopup, setArticleResults, setShowArticlePopup };
}