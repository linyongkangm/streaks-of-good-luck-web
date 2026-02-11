import { useEffect, useState } from "react";
import * as ctools from "@/app/tools/ctools";
export type ArticleProcessResult = {
  title: string;
  status: string;
  source_url: string;
  rawData?: any;
};
export default function useStoreArticle() {
  // Placeholder for future article storage logic
  const [articleResults, setArticleResults] = useState<ArticleProcessResult[]>([]);
  const [showArticlePopup, setShowArticlePopup] = useState(false);

  // 直接保存文章（不生成摘要）
  const saveArticleDirectly = async (article: ArticleProcessResult) => {
    if (!article.rawData) return;
    
    article.status = '保存中...';
    setArticleResults(prev => [...prev]);
    
    try {
      const response = await fetch('/api/process-articles/save-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: article.rawData }),
      });
      const result = await response.json();
      
      if (result.success) {
        article.status = '直接保存成功';
      } else {
        article.status = '保存失败';
      }
    } catch (error) {
      console.error('Failed to save article directly:', error);
      article.status = '保存失败';
    }
    
    setArticleResults(prev => [...prev]);
  };

  // 重试处理文章
  const retryArticle = async (article: ArticleProcessResult) => {
    if (!article.rawData) return;
    
    article.status = '重试中...';
    setArticleResults(prev => [...prev]);
    
    try {
      const result = await ctools.processArticles([article.rawData]);
      
      if (result.successfulSourceUrls && result.successfulSourceUrls.includes(article.source_url)) {
        article.status = '处理完成';
      } else if (result.existingSourceUrls && result.existingSourceUrls.includes(article.source_url)) {
        article.status = '已存在，无需处理';
      } else {
        article.status = '处理失败';
      }
    } catch (error) {
      console.error('Failed to retry article:', error);
      article.status = '处理失败';
    }
    
    setArticleResults(prev => [...prev]);
  };
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
        rawData: rec,
      }));
      setArticleResults((preResults) => {
        return preResults.concat(initialResults);
      });
      try {
        const result = await ctools.processArticles(detail.records);
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
  return { 
    articleResults, 
    showArticlePopup, 
    setArticleResults, 
    setShowArticlePopup,
    saveArticleDirectly,
    retryArticle
  };
}