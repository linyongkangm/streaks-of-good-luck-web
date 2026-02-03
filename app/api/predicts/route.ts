import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db'

// GET /api/predicts?month=YYYY-MM
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  let where = {};
  if (month) {
    // 计算本月起止
    const [year, m] = month.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, m - 1, 1));
    const monthEnd = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
    where = {
      interval_start: { lte: monthEnd },
      interval_end: { gte: monthStart },
    };
  }
  const predicts = await prisma.info__predict.findMany({
    where,
    include: {
      summary__article: true,
    },
  });
  
  // 自定义排序：先按 VerifyStatus 排序，再按 interval_start 排序
  const statusOrder: Record<string, number> = {
    'not_due': 1,
    'partial': 2,
    'not_implemented': 3,
    'delayed': 4,
    'implemented': 5
  };
  
  predicts.sort((a, b) => {
    // 先按 verify_status 排序
    const statusA = statusOrder[a.verify_status] || 999;
    const statusB = statusOrder[b.verify_status] || 999;
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    // 再按 interval_start 排序
    return new Date(a.interval_start).getTime() - new Date(b.interval_start).getTime();
  });
  
  return NextResponse.json(predicts);
}

// POST /api/predicts
export async function POST(req: NextRequest) {
  const data = await req.json();
  // 校验必填
  if (!data.content || !data.proposed_at || !data.interval_start || !data.interval_end) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }
  if (new Date(data.interval_end) < new Date(data.interval_start)) {
    return NextResponse.json({ error: '结束时间不能早于开始时间' }, { status: 400 });
  }
  if (data.assoc_type === 'article' && !data.assoc_article_id) {
    return NextResponse.json({ error: '请选择关联文章' }, { status: 400 });
  }
  if (data.assoc_type === 'link' && !data.assoc_link) {
    return NextResponse.json({ error: '请填写关联链接' }, { status: 400 });
  }
  // 创建
  const predict = await prisma.info__predict.create({
    data: {
      content: data.content,
      predictor: data.predictor,
      proposed_at: new Date(data.proposed_at),
      interval_start: new Date(data.interval_start),
      interval_end: new Date(data.interval_end),
      assoc_type: data.assoc_type ?? null,
      assoc_article_id: data.assoc_type === 'article' ? data.assoc_article_id : null,
      assoc_link: data.assoc_type === 'link' ? data.assoc_link : null,
    },
  });
  return NextResponse.json(predict);
}
