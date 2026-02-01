import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/predicts/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const predict = await prisma.info__predict.findUnique({
    where: { id: BigInt(id) },
    include: { summary__article: true },
  });
  if (!predict) {
    return NextResponse.json({ error: '未找到预测' }, { status: 404 });
  }
  return NextResponse.json(predict);
}

// PUT /api/predicts/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const data = await req.json();
  try {
    const predict = await prisma.info__predict.update({
      where: { id: BigInt(id) },
      data,
    });
    return NextResponse.json(predict);
  } catch (e) {
    return NextResponse.json({ error: '更新失败' }, { status: 400 });
  }
}

// DELETE /api/predicts/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  try {
    await prisma.info__predict.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: '删除失败' }, { status: 400 });
  }
}
