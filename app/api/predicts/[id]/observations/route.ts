import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/predicts/[id]/observations - 获取某个预测的所有观察记录
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const predictId = BigInt((await params).id);
    
    const observations = await prisma.indicator__predict_observation.findMany({
      where: { predict_id: predictId },
      orderBy: { observation_date: 'desc' },
    });
    
    return NextResponse.json(observations);
  } catch (error) {
    console.error('获取观察记录失败:', error);
    return NextResponse.json({ error: '获取观察记录失败' }, { status: 500 });
  }
}

// POST /api/predicts/[id]/observations - 创建观察记录
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const predictId = BigInt((await params).id);
    const data = await req.json();
    
    // 校验必填字段
    if (!data.observation_date || !data.content) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }
    
    // 验证预测记录是否存在
    const predict = await prisma.info__predict.findUnique({
      where: { id: predictId },
    });
    
    if (!predict) {
      return NextResponse.json({ error: '预测记录不存在' }, { status: 404 });
    }
    
    // 创建观察记录
    const observation = await prisma.indicator__predict_observation.create({
      data: {
        predict_id: predictId,
        observation_date: new Date(data.observation_date),
        content: data.content,
      },
    });
    
    return NextResponse.json(observation);
  } catch (error) {
    console.error('创建观察记录失败:', error);
    return NextResponse.json({ error: '创建观察记录失败' }, { status: 500 });
  }
}
