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
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* 左侧：行业板块列表 */}
      <div className="col-span-3 space-y-2">
        <h2 className="text-xl font-bold mb-4">行业板块</h2>
        <div className="space-y-1 max-h-[80vh] overflow-y-auto">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => fetchBoardDetail(board.id)}
              className={`w-full text-left px-4 py-2 rounded hover:bg-gray-100 transition ${
                selectedBoard?.id === board.id ? 'bg-blue-100' : ''
              }`}
            >
              {board.board_name}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧：详细信息 */}
      <div className="col-span-9">
        {detailLoading ? (
          <div>加载详情中...</div>
        ) : selectedBoard ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{selectedBoard.board_name}</h2>

            {/* 关联公司 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">关联公司</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border text-left">公司代码</th>
                      <th className="px-4 py-2 border text-left">公司名称</th>
                      <th className="px-4 py-2 border text-left">行业</th>
                      <th className="px-4 py-2 border text-left">权重</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBoard.relation__stock_board_company.map((relation) => (
                      <tr key={relation.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border">{relation.info__stock_company.company_code}</td>
                        <td className="px-4 py-2 border">{relation.info__stock_company.company_name}</td>
                        <td className="px-4 py-2 border">{relation.info__stock_company.industry || '-'}</td>
                        <td className="px-4 py-2 border">{relation.weight.toString()}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 行业分析报告 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">行业分析报告</h3>
              <div className="space-y-4">
                {selectedBoard.relation__board_industry_analysis.map((relation) => (
                  <div key={relation.id} className="border border-gray-200 rounded p-4">
                    <h4 className="font-semibold text-base mb-2">
                      {relation.info__industry_analysis.title}
                    </h4>
                    <div className="text-sm text-gray-600 mb-2">
                      {relation.info__industry_analysis.publisher && (
                        <span>发布者: {relation.info__industry_analysis.publisher} | </span>
                      )}
                      {relation.info__industry_analysis.author && (
                        <span>作者: {relation.info__industry_analysis.author} | </span>
                      )}
                      {relation.info__industry_analysis.report_time && (
                        <span>
                          报告时间: {new Date(relation.info__industry_analysis.report_time).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{relation.info__industry_analysis.summary}</p>
                    {relation.info__industry_analysis.original_url && (
                      <a
                        href={relation.info__industry_analysis.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm mt-2 inline-block"
                      >
                        查看原文
                      </a>
                    )}
                  </div>
                ))}
                {selectedBoard.relation__board_industry_analysis.length === 0 && (
                  <p className="text-gray-500">暂无行业分析报告</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-20">
            请从左侧选择一个行业板块
          </div>
        )}
      </div>
    </div>
  )
}
