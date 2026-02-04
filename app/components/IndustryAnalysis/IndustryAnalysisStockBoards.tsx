'use client'

import { useState } from 'react'
import type {
  info__stock_board,
  StockBoardWithRelations,
} from '@/types'

interface Props {
  boards: info__stock_board[];
  selectedBoard: StockBoardWithRelations | null;
  setSelectedBoard: (board: StockBoardWithRelations | null) => void;
  fetchBoards: () => Promise<void>;
  fetchBoardDetail: (boardId: number) => Promise<void>;
}

/* 板块标题编辑 */
export default function IndustryAnalysisStockBoards({ boards, selectedBoard, setSelectedBoard, fetchBoards, fetchBoardDetail }: Props) {
  // 板块编辑状态
  const [showAddBoardModal, setShowAddBoardModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
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
  return <div className="bg-white rounded-xl shadow-lg p-6 sticky">
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
}