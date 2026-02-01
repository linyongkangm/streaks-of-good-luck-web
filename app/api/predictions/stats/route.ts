import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/predictions/stats - 获取预测统计信息
export async function GET(req: NextRequest) {
  try {
    // 获取所有预测
    const allPredicts = await prisma.info__predict.findMany({
      select: {
        interval_start: true,
        interval_end: true,
      },
    });

    // 按年统计
    const yearStats: Record<number, number> = {};
    // 按年月统计
    const monthStats: Record<string, number> = {};

    allPredicts.forEach((predict) => {
      const startDate = new Date(predict.interval_start);
      const endDate = new Date(predict.interval_end);
      
      // 记录涉及的年份（用于确保每个预测在每年只统计一次）
      const yearsInvolved = new Set<number>();
      
      // 获取涉及的所有月份
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        // 记录涉及的年份
        yearsInvolved.add(year);
        
        // 统计月份（每个月都统计）
        monthStats[monthKey] = (monthStats[monthKey] || 0) + 1;
        
        // 移到下一个月
        currentDate.setDate(1);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      // 对于涉及的每个年份，每个预测只统计一次
      yearsInvolved.forEach(year => {
        yearStats[year] = (yearStats[year] || 0) + 1;
      });
    });

    return NextResponse.json({
      years: yearStats,
      months: monthStats,
    });
  } catch (error) {
    console.error('获取预测统计失败:', error);
    return NextResponse.json({ error: '获取统计信息失败' }, { status: 500 });
  }
}
