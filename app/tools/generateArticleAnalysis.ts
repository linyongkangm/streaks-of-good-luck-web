import { prisma } from '@/lib/db';
import { summary__article } from '@prisma/client';
import { PYTHON_API_URL } from '../api/update-articles/route';

export async function generateArticleAnalysis(article: summary__article, isUpdate: boolean = false) {
  try {
    const { source_url, title, contributor, publication, issue_date, source_text } = article;

    if (!source_text) {
      console.log(`Skipping article "${title}" - no source_text provided`);
      return { success: false, reason: 'no source_text' };
    }

    console.log(`${isUpdate ? 'Reanalyzing' : 'Analyzing'} article: ${title}`);

    // 调用 Python API 生成分析
    console.log(`Calling Python API: ${PYTHON_API_URL}/analyze-article`);
    const response = await fetch(`${PYTHON_API_URL}/analyze-article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_text: source_text,
        issue_date: issue_date,
      }),
      signal: AbortSignal.timeout(1000 * 60 * 5) // 5分钟超时，可根据业务调整
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log(`Successfully received analysis for "${title}":`, result);

    // 保存到数据库
    if (result.success && result.analysis) {
      const { tags, summary } = result.analysis;

      const data = {
        source_url,
        title,
        tags: tags || '',
        summary: summary || '',
        source_text: source_text,
      } as summary__article;

      if (publication) data.publication = publication;
      if (issue_date) data.issue_date = new Date(issue_date);
      if (contributor) data.contributor = contributor;

      if (isUpdate) {
        // 更新现有文章
        await prisma.summary__article.update({
          where: { source_url },
          data,
        });
        console.log(`✓ Article "${title}" updated in database`);
      } else {
        // 创建新文章
        await prisma.summary__article.create({
          data,
        });
        console.log(`✓ Article "${title}" saved to database`);
      }

      return { success: true, data: data };
    }

    return { success: false, reason: 'no analysis result' };
  } catch (error) {
    console.error(`Failed to analyze article:`, error);
    return { success: false, error: String(error) };
  }
}
