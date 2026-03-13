import { useEffect, useRef, useState } from "react";
import * as ctools from "@/app/tools/ctools";
export type ArticleProcessResult = {
  title: string;
  status: string;
  source_url: string;
  rawData?: any;
  id?: string; // 用于队列跟踪
};

type PendingArticle = ArticleProcessResult & { id: string };
const MAX_CONCURRENT = 5;

export default function useStoreArticle() {
  // Placeholder for future article storage logic
  const [articleResults, setArticleResults] = useState<ArticleProcessResult[]>([]);
  const [showArticlePopup, setShowArticlePopup] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [pendingQueue, setPendingQueue] = useState<PendingArticle[]>([]);
  const queueRef = useRef<PendingArticle[]>([]);
  const activeWorkersRef = useRef(0);
  const isDrivingRef = useRef(false);

  const setArticleStatus = (sourceUrl: string, status: string) => {
    setArticleResults(prev =>
      prev.map(item =>
        item.source_url === sourceUrl
          ? { ...item, status }
          : item
      )
    );
  };

  const syncQueueState = () => {
    setPendingQueue([...queueRef.current]);
  };

  const processSingleArticle = async (nextArticle: PendingArticle) => {
    // 更新状态为"处理中..."
    setArticleStatus(nextArticle.source_url, '处理中...');

    activeWorkersRef.current += 1;
    setProcessingCount(activeWorkersRef.current);

    try {
      const result = await ctools.processArticles([nextArticle.rawData]);
      const successfulSourceUrls = result.successfulSourceUrls || [];
      const existingSourceUrls = result.existingSourceUrls || [];

      const newStatus = successfulSourceUrls.includes(nextArticle.source_url)
        ? '处理完成'
        : existingSourceUrls.includes(nextArticle.source_url)
          ? '已存在，无需处理'
          : '处理失败';

      setArticleStatus(nextArticle.source_url, newStatus);
    } catch (error) {
      console.error('Failed to process article:', error);
      setArticleStatus(nextArticle.source_url, '处理失败');
    } finally {
      activeWorkersRef.current = Math.max(0, activeWorkersRef.current - 1);
      setProcessingCount(activeWorkersRef.current);
      driveQueue();
    }
  };

  // 单驱动循环：只有这个入口负责拉起任务
  const driveQueue = () => {
    if (isDrivingRef.current) {
      return;
    }

    isDrivingRef.current = true;
    try {
      while (activeWorkersRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
        const nextArticle = queueRef.current.shift();
        if (!nextArticle) {
          break;
        }

        syncQueueState();
        void processSingleArticle(nextArticle);
      }
    } finally {
      isDrivingRef.current = false;
    }
  };

  const enqueueArticles = (articles: PendingArticle[]) => {
    if (articles.length === 0) {
      return;
    }

    queueRef.current = [...queueRef.current, ...articles];
    syncQueueState();
    driveQueue();
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
    setArticleStatus(article.source_url, '队列中');
    enqueueArticles([articleWithId]);
  };

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

      enqueueArticles(articlesWithId);
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
    retryArticle,
    processingCount,
  };
}