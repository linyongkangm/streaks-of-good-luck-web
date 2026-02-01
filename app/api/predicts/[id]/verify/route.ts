import { NextRequest, NextResponse } from 'next/server';
import { VerifyStatus } from '@prisma/client';
import { prisma } from '@/lib/db'

// PATCH /api/predicts/:id/verify
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const data = await req.json();
  if (!data.verify_status) {
    return NextResponse.json({ error: '缺少验证状态' }, { status: 400 });
  }
  if (data.verify_status === 'delayed' && !data.delayed_note) {
    return NextResponse.json({ error: '延期备注必填' }, { status: 400 });
  }
  try {
    const predict = await prisma.info__predict.update({
      where: { id: BigInt(id) },
      data: {
        verify_status: data.verify_status as VerifyStatus,
        delayed_note: data.verify_status === 'delayed' ? data.delayed_note : null,
      },
    });
    return NextResponse.json(predict);
  } catch (e) {
    return NextResponse.json({ error: '状态更新失败' }, { status: 400 });
  }
}
