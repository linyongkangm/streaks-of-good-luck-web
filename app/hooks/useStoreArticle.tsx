import { useEffect, useState } from "react";
import * as ctools from "@/app/tools/ctools";
export type ArticleProcessResult = {
  title: string;
  status: string;
  source_url: string;
  rawData?: any;
  id?: string; // 用于队列跟踪
};

type PendingArticle = ArticleProcessResult & { id: string };

export default function useStoreArticle() {
  // Placeholder for future article storage logic
  const [articleResults, setArticleResults] = useState<ArticleProcessResult[]>([]);
  const [showArticlePopup, setShowArticlePopup] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [pendingQueue, setPendingQueue] = useState<PendingArticle[]>([]);

  // 处理队列中的下一个任务
  const processNextInQueue = async (queue: PendingArticle[], processing: number) => {
    if (queue.length === 0 || processing >= 5) {
      return;
    }

    const nextArticle = queue[0];
    const remainingQueue = queue.slice(1);
    setPendingQueue(remainingQueue);

    // 更新状态为"处理中..."
    setArticleResults(prev =>
      prev.map(item =>
        item.source_url === nextArticle.source_url
          ? { ...item, status: '处理中...' }
          : item
      )
    );

    setProcessingCount(processing + 1);

    try {
      const result = await ctools.processArticles([nextArticle.rawData]);
      const successfulSourceUrls = result.successfulSourceUrls || [];
      const existingSourceUrls = result.existingSourceUrls || [];

      const newStatus = successfulSourceUrls.includes(nextArticle.source_url)
        ? '处理完成'
        : existingSourceUrls.includes(nextArticle.source_url)
          ? '已存在，无需处理'
          : '处理失败';

      setArticleResults(prev =>
        prev.map(item =>
          item.source_url === nextArticle.source_url
            ? { ...item, status: newStatus }
            : item
        )
      );
    } catch (error) {
      console.error('Failed to process article:', error);
      setArticleResults(prev =>
        prev.map(item =>
          item.source_url === nextArticle.source_url
            ? { ...item, status: '处理失败' }
            : item
        )
      );
    }

    setProcessingCount(prev => Math.max(0, prev - 1));
    // 递归处理下一个
    setTimeout(() => {
      processNextInQueue(remainingQueue, processing);
    }, 0);
  };

  // 直接保存文章（不生成摘要）
  const saveArticleDirectly = async (article: ArticleProcessResult) => {
    if (!article.rawData) return;
    
    setArticleResults(prev =>
      prev.map(item =>
        item.source_url === article.source_url
          ? { ...item, status: '保存中...' }
          : item
      )
    );
    
    try {
      const response = await fetch('/api/process-articles/save-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: article.rawData }),
      });
      const result = await response.json();
      
      if (result.success) {
        setArticleResults(prev =>
          prev.map(item =>
            item.source_url === article.source_url
              ? { ...item, status: '直接保存成功' }
              : item
          )
        );
      } else {
        setArticleResults(prev =>
          prev.map(item =>
            item.source_url === article.source_url
              ? { ...item, status: '保存失败' }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to save article directly:', error);
      setArticleResults(prev =>
        prev.map(item =>
          item.source_url === article.source_url
            ? { ...item, status: '保存失败' }
            : item
        )
      );
    }
  };

  // 重试处理文章
  const retryArticle = async (article: ArticleProcessResult) => {
    if (!article.rawData) return;
    
    // 重新加入队列
    const articleWithId: PendingArticle = {
      ...article,
      id: `${article.source_url}_${Date.now()}`,
    };

    // 更新为队列中状态
    setArticleResults(prev =>
      prev.map(item =>
        item.source_url === article.source_url
          ? { ...item, status: '队列中' }
          : item
      )
    );

    setPendingQueue(prev => [...prev, articleWithId]);

    // 如果还有位置，立即处理队列
    if (processingCount < 5) {
      processNextInQueue([...pendingQueue, articleWithId], processingCount);
    }
  };

  // 监听 processingCount 和 pendingQueue 变化，自动处理下一个
  useEffect(() => {
    try {
      if (processingCount < 5 && pendingQueue.length > 0) {
        processNextInQueue(pendingQueue, processingCount);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }, [processingCount, pendingQueue]);
  useEffect(() => {
    console.log('Setting up spider event listener');
    const handler = async (e: Event) => {
      console.log('spider event received:', e);
      const detail = (e as CustomEvent).detail;
      setShowArticlePopup(true);
      // Set initial status to '队列中'
      const initialResults: ArticleProcessResult[] = detail.records.map((rec: any) => ({
        title: rec.title || '无标题',
        status: '队列中',
        source_url: rec.source_url,
        rawData: rec,
      }));
      setArticleResults((preResults) => {
        return preResults.concat(initialResults);
      });

      // 将所有文章加入队列
      const articlesWithId: PendingArticle[] = detail.records.map((rec: any, idx: number) => ({
        title: rec.title || '无标题',
        status: '队列中',
        source_url: rec.source_url,
        rawData: rec,
        id: `${rec.source_url}_${idx}_${Date.now()}`,
      }));
      
      setPendingQueue(prev => [...prev, ...articlesWithId]);
    };
    document.addEventListener('STORE_ARTICLE', handler);
    return () => document.removeEventListener('STORE_ARTICLE', handler);
  }, [processingCount, pendingQueue]);

  return { 
    articleResults, 
    showArticlePopup, 
    setArticleResults, 
    setShowArticlePopup,
    saveArticleDirectly,
    retryArticle,
    processingCount,
  };
}