'use client'

import { useState, useEffect } from 'react'
import type { 
  info__stock_board, 
  StockBoardWithRelations 
} from '@/types'

export default function IndustryAnalysis() {
  const [boards, setBoards] = useState<info__stock_board[]>([])
  const [selectedBoard, setSelectedBoard] = useState<StockBoardWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/stock-boards')
      const data = await response.json()
      setBoards(data.data || [])
    } catch (error) {
      console.error('Failed to fetch boards:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBoardDetail = async (boardId: number) => {
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/stock-boards/${boardId}`)
      const data = await response.json()
      setSelectedBoard(data.data)
    } catch (error) {
      console.error('Failed to fetch board detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6 p-6 max-w-[1800px] mx-auto">
      {/* 左侧：行业板块列表 */}
      <div className="col-span-3">
        <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
          <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            行业板块
          </h2>
          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin pr-2">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => fetchBoardDetail(board.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  selectedBoard?.id === board.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg scale-105'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-md'
                }`}
              >
                <span className="font-medium">{board.board_name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧：详细信息 */}
      <div className="col-span-9">
        {detailLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : selectedBoard ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {selectedBoard.board_name}
              </h2>
            </div>

            {/* 关联公司 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🏢</span>
                <span>关联公司</span>
                <span className="text-sm text-slate-500 font-normal">
                  ({selectedBoard.relation__stock_board_company.length})
                </span>
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">公司代码</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">公司名称</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">行业</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">权重</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedBoard.relation__stock_board_company.map((relation, idx) => (
                      <tr key={relation.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-slate-900">
                          {relation.info__stock_company.company_code}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {relation.info__stock_company.company_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {relation.info__stock_company.industry || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                            {relation.weight.toString()}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 行业分析报告 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <span>行业分析报告</span>
                <span className="text-sm text-slate-500 font-normal">
                  ({selectedBoard.relation__board_industry_analysis.length})
                </span>
              </h3>
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
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-xl shadow-lg">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-slate-500 text-lg">请从左侧选择一个行业板块</p>
          </div>
        )}
      </div>
    </div>
  )
}
