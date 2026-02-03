import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { StockCompanyDetailResponse, ApiError } from '@/types'

// GET /api/stock-companies/[id] - 获取单个股票公司信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StockCompanyDetailResponse | ApiError>> {
  try {
    const id = parseInt((await params).id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的公司ID' },
        { status: 400 }
      )
    }

    const company = await prisma.info__stock_company.findUnique({
      where: { id },
      include: {
        indicator__company_finance: {
          orderBy: {
            report_date: 'desc',
          },
          take: 10, // 最近10期财务数据
        },
      },
    })
    if (!company) {
      return NextResponse.json(
        { error: '公司不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: company })
  } catch (error) {
    console.error('获取公司信息失败:', error)
    return NextResponse.json(
      { error: '获取公司信息失败' },
      { status: 500 }
    )
  }
}

// PATCH /api/stock-companies/[id] - 更新公司信息
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const data = await req.json();

    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的公司ID' }, { status: 400 });
    }

    // 检查公司是否存在
    const existing = await prisma.info__stock_company.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: '公司不存在' }, { status: 404 });
    }

    // 如果更新代码，检查是否与其他公司冲突
    if (data.company_code || data.company_akshare_code) {
      const orConditions = [];
      if (data.company_code) orConditions.push({ company_code: data.company_code });
      if (data.company_akshare_code) orConditions.push({ company_akshare_code: data.company_akshare_code });

      if (orConditions.length > 0) {
        const conflict = await prisma.info__stock_company.findFirst({
          where: {
            AND: [
              { id: { not: id } },
              { OR: orConditions },
            ],
          },
        });

        if (conflict) {
          return NextResponse.json({ error: '公司代码已被其他公司使用' }, { status: 400 });
        }
      }
    }

    // 更新公司
    const updateData: any = {};
    if (data.company_name !== undefined) updateData.company_name = data.company_name;
    if (data.company_code !== undefined) updateData.company_code = data.company_code;
    if (data.company_akshare_code !== undefined) updateData.company_akshare_code = data.company_akshare_code;
    if (data.industry !== undefined) updateData.industry = data.industry || null;
    if (data.ipo_date !== undefined) updateData.ipo_date = data.ipo_date ? new Date(data.ipo_date) : null;

    const company = await prisma.info__stock_company.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error('更新公司失败:', error);
    return NextResponse.json({ error: '更新公司失败' }, { status: 500 });
  }
}

// DELETE /api/stock-companies/[id] - 删除公司
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);

    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的公司ID' }, { status: 400 });
    }

    // 检查公司是否存在
    const existing = await prisma.info__stock_company.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: '公司不存在' }, { status: 404 });
    }

    // 删除公司
    await prisma.info__stock_company.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除公司失败:', error);
    return NextResponse.json({ error: '删除公司失败' }, { status: 500 });
  }
}
