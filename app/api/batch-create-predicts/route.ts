import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/batch-create-predicts - 批量创建预测
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { predicts } = body;

    if (!predicts || !Array.isArray(predicts) || predicts.length === 0) {
      return NextResponse.json(
        { success: false, message: '缺少预测数据' },
        { status: 400 }
      );
    }

    // 验证每个预测的必填字段
    for (const predict of predicts) {
      if (!predict.content || !predict.proposed_at || !predict.interval_start || !predict.interval_end) {
        return NextResponse.json(
          { success: false, message: '预测数据缺少必填字段' },
          { status: 400 }
        );
      }
      if (new Date(predict.interval_end) < new Date(predict.interval_start)) {
        return NextResponse.json(
          { success: false, message: '结束时间不能早于开始时间' },
          { status: 400 }
        );
      }
    }

    console.log(`Batch creating ${predicts.length} predictions...`);

    // 批量创建预测
    const createdPredicts = await prisma.$transaction(
      predicts.map((predict: any) =>
        prisma.info__predict.create({
          data: {
            content: predict.content,
            predictor: predict.predictor || null,
            proposed_at: new Date(predict.proposed_at),
            interval_start: new Date(predict.interval_start),
            interval_end: new Date(predict.interval_end),
            assoc_type: predict.assoc_type || null,
            assoc_article_id: predict.assoc_article_id ? BigInt(predict.assoc_article_id) : null,
            assoc_link: predict.assoc_link || null,
          },
        })
      )
    );

    console.log(`✓ Successfully created ${createdPredicts.length} predictions`);

    return NextResponse.json({
      success: true,
      message: `成功创建 ${createdPredicts.length} 个预测`,
      count: createdPredicts.length,
      data: createdPredicts,
    });
  } catch (error) {
    console.error('Failed to batch create predictions:', error);
    return NextResponse.json(
      {
        success: false,
        message: '服务器错误：无法创建预测',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
