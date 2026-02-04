'use client'

import { useState, useEffect, use, useMemo } from 'react'
import type {
  info__stock_board,
  StockBoardWithRelations,
  info__stock_company
} from '@/types'
import IndustryAnalysisStockBoardInfo from './IndustryAnalysisStockBoardInfo'
import IndustryAnalysisRelatedCompanies from './IndustryAnalysisRelatedCompanies'

export default function IndustryAnalysis() {
  const [boards, setBoards] = useState<info__stock_board[]>([])
  const [selectedBoard, setSelectedBoard] = useState<StockBoardWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  // 板块编辑状态
  const [showAddBoardModal, setShowAddBoardModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')

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

  // 板块操作
  const handleAddBoard = async () => {
    if (!newBoardName.trim()) return
    try {
      const response = await fetch('/api/stock-boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_name: newBoardName }),
      })
      if (response.ok) {
        await fetchBoards()
        setNewBoardName('')
        setShowAddBoardModal(false)
      }
    } catch (error) {
      console.error('Failed to add board:', error)
    }
  }

  const handleDeleteBoard = async (boardId: number) => {
    if (!confirm('确定要删除这个板块吗？这将同时删除所有关联关系。')) return
    try {
      const response = await fetch(`/api/stock-boards/${boardId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchBoards()
        if (selectedBoard?.id === boardId) {
          setSelectedBoard(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete board:', error)
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
        <div className="bg-white rounded-xl shadow-lg p-6 sticky">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              行业板块
            </h2>
            <button
              onClick={() => setShowAddBoardModal(true)}
              className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md"
              title="添加板块"
            >
              <span className="text-lg">+</span>
            </button>
          </div>
          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin pr-2">
            {boards.map((board) => (
              <div key={board.id} className="relative group">
                <button
                  onClick={() => fetchBoardDetail(board.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${selectedBoard?.id === board.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-md'
                    }`}
                >
                  <span className="font-medium">{board.board_name}</span>
                </button>
                <button
                  onClick={() => handleDeleteBoard(board.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded bg-red-500 text-white hover:bg-red-600 transition-all text-xs"
                  title="删除板块"
                >
                  ✕
                </button>
              </div>
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
            {/* 板块标题编辑 */}
            <IndustryAnalysisStockBoardInfo selectedBoard={selectedBoard} fetchBoards={fetchBoards} fetchBoardDetail={fetchBoardDetail}></IndustryAnalysisStockBoardInfo>

            {/* 关联公司 */}
            <IndustryAnalysisRelatedCompanies selectedBoard={selectedBoard} fetchBoards={fetchBoards} fetchBoardDetail={fetchBoardDetail}></IndustryAnalysisRelatedCompanies>

            {/* 行业分析报告 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                <span>行业分析报告</span>
                <span className="text-lg text-slate-500 font-normal">
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
      {/* 添加板块模态框 */}
      {showAddBoardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              添加新板块
            </h3>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="输入板块名称"
              className="text-slate-900 w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleAddBoard()}
            />
            <div className="flex gap-3">
              <button
                onClick={handleAddBoard}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddBoardModal(false)
                  setNewBoardName('')
                }}
                className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
