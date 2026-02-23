'use client'

import { useState, useEffect } from 'react'
import type {
  StockBoardWithRelations,
} from '@/types'
import Panel from '@/app/widget/Panel';

interface Props {
  selectedBoard: StockBoardWithRelations;
}

/* 板块标题编辑 */
export default function IndustryAnalysisIndustryAnalysis({ selectedBoard }: Props) {
  return <Panel title="分析报告">
    <div className="space-y-4">
      {selectedBoard.relation__board_industry_analysis.map((relation) => (
        <div key={relation.id} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50">
          <h4 className="font-semibold text-lg mb-3 text-slate-900">
            {relation.info__industry_analysis.title}
          </h4>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-3">
            {relation.info__industry_analysis.publisher && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                <span>📢</span>
                {relation.info__industry_analysis.publisher}
              </span>
            )}
            {relation.info__industry_analysis.author && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                <span>✍️</span>
                {relation.info__industry_analysis.author}
              </span>
            )}
            {relation.info__industry_analysis.report_time && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                <span>📅</span>
                {new Date(relation.info__industry_analysis.report_time).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap mb-3">
            {relation.info__industry_analysis.summary}
          </p>
          {relation.info__industry_analysis.original_url && (
            <a
              href={relation.info__industry_analysis.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm group"
            >
              查看原文
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </a>
          )}
        </div>
      ))}
      {selectedBoard.relation__board_industry_analysis.length === 0 && (
        <p className="text-center text-slate-500 py-8">暂无行业分析报告</p>
      )}
    </div>
  </Panel>
}