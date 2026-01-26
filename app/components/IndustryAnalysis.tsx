'use client'

import { useState, useEffect, use, useMemo } from 'react'
import type {
  info__stock_board,
  StockBoardWithRelations,
  info__stock_company
} from '@/types'

export default function IndustryAnalysis() {
  const [boards, setBoards] = useState<info__stock_board[]>([])
  const [selectedBoard, setSelectedBoard] = useState<StockBoardWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  // 板块编辑状态
  const [isEditingBoard, setIsEditingBoard] = useState(false)
  const [editBoardName, setEditBoardName] = useState('')
  const [showAddBoardModal, setShowAddBoardModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')

  // 公司编辑状态
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false)
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null)
  const [editWeightValue, setEditWeightValue] = useState('')
  const [allCompanies, setAllCompanies] = useState<info__stock_company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [newCompanyWeight, setNewCompanyWeight] = useState('0')
  const totalWeight = useMemo(() => {
    if (!selectedBoard) return 0
    return selectedBoard.relation__stock_board_company.reduce((sum, company) => sum + Number(company.weight), 0)
  }, [selectedBoard])
  useEffect(() => {
    fetchBoards()
    fetchAllCompanies()
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

  const fetchAllCompanies = async () => {
    try {
      const response = await fetch('/api/stock-companies?limit=1000')
      const data = await response.json()
      setAllCompanies(data.data || [])
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }

  const fetchBoardDetail = async (boardId: number) => {
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/stock-boards/${boardId}`)
      const data = await response.json()
      setSelectedBoard(data.data)
      setEditBoardName(data.data.board_name)
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

  const handleUpdateBoard = async () => {
    if (!selectedBoard || !editBoardName.trim()) return
    try {
      const response = await fetch(`/api/stock-boards/${selectedBoard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_name: editBoardName }),
      })
      if (response.ok) {
        await fetchBoards()
        await fetchBoardDetail(selectedBoard.id)
        setIsEditingBoard(false)
      }
    } catch (error) {
      console.error('Failed to update board:', error)
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

  // 公司操作
  const handleAddCompany = async () => {
    if (!selectedBoard || !selectedCompanyId) return
    try {
      const response = await fetch('/api/board-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board_id: selectedBoard.id,
          company_id: selectedCompanyId,
          weight: parseFloat(newCompanyWeight) || 0,
        }),
      })
      if (response.ok) {
        await fetchBoardDetail(selectedBoard.id)
        setShowAddCompanyModal(false)
        setSelectedCompanyId(null)
        setNewCompanyWeight('0')
      }
    } catch (error) {
      console.error('Failed to add company:', error)
    }
  }

  const handleUpdateWeight = async (relationId: number, weight: string) => {
    if (!selectedBoard) return
    try {
      const response = await fetch(`/api/board-companies/${relationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: parseFloat(weight) || 0 }),
      })
      if (response.ok) {
        await fetchBoardDetail(selectedBoard.id)
        setEditingWeightId(null)
      }
    } catch (error) {
      console.error('Failed to update weight:', error)
    }
  }

  const handleRemoveCompany = async (relationId: number) => {
    if (!selectedBoard || !confirm('确定要移除这个公司吗？')) return
    try {
      const response = await fetch(`/api/board-companies/${relationId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchBoardDetail(selectedBoard.id)
      }
    } catch (error) {
      console.error('Failed to remove company:', error)
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              {isEditingBoard ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editBoardName}
                    onChange={(e) => setEditBoardName(e.target.value)}
                    className="text-slate-900 flex-1 text-3xl font-bold px-3 py-2 border-2 border-blue-500 rounded-lg focus:outline-none"
                  />
                  <button
                    onClick={handleUpdateBoard}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingBoard(false)
                      setEditBoardName(selectedBoard.board_name)
                    }}
                    className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {selectedBoard.board_name}
                  </h2>
                  <button
                    onClick={() => setIsEditingBoard(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    ✏️ 编辑
                  </button>
                </div>
              )}
            </div>
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
            {/* 关联公司 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                  <span>关联公司</span>
                  <span className="text-lg text-slate-500 font-normal">
                    ({selectedBoard.relation__stock_board_company.length})
                  </span>
                </h3>
                <button
                  onClick={() => setShowAddCompanyModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 text-sm shadow-md"
                >
                  + 添加公司
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">公司代码</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">公司名称</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">行业</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">权重</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedBoard.relation__stock_board_company.map((relation) => (
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
                          {editingWeightId === relation.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editWeightValue}
                                onChange={(e) => setEditWeightValue(e.target.value)}
                                className="text-slate-900 w-20 px-2 py-1 border-2 border-blue-500 rounded"
                                step="1"
                              />
                              <button
                                onClick={() => handleUpdateWeight(relation.id, editWeightValue)}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingWeightId(null)}
                                className="px-2 py-1 bg-gray-400 text-white rounded text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingWeightId(relation.id)
                                setEditWeightValue(relation.weight.toString())
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200"
                            >
                              {((Number(relation.weight) / totalWeight) * 100).toFixed(2)}% ✏️
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleRemoveCompany(relation.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* 添加公司模态框 */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              添加公司到板块
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">选择公司</label>
              <select
                value={selectedCompanyId || ''}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                className="text-slate-900 w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">请选择公司</option>
                {allCompanies
                  .filter(company =>
                    !selectedBoard?.relation__stock_board_company.some(
                      rel => rel.company_id === company.id
                    )
                  )
                  .map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.company_code} - {company.company_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">权重 (%)</label>
              <input
                type="number"
                value={newCompanyWeight}
                onChange={(e) => setNewCompanyWeight(e.target.value)}
                placeholder="0"
                step="1"
                className="text-slate-900 w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddCompany}
                disabled={!selectedCompanyId}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddCompanyModal(false)
                  setSelectedCompanyId(null)
                  setNewCompanyWeight('0')
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
