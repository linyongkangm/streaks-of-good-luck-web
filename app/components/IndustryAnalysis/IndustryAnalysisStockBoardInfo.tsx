'use client'

import { useState, useEffect, use, useMemo } from 'react'
import type {
  info__stock_board,
  StockBoardWithRelations,
  info__stock_company
} from '@/types'

interface Props {
  selectedBoard: info__stock_board;
  fetchBoards: () => Promise<void>;
  fetchBoardDetail: (boardId: number) => Promise<void>;
}

/* 板块标题编辑 */
export default function IndustryAnalysisStockBoardInfo({ selectedBoard, fetchBoards, fetchBoardDetail }: Props) {
  const [isEditingBoard, setIsEditingBoard] = useState(false)
  const [editBoardName, setEditBoardName] = useState('')

  useEffect(() => {
    setEditBoardName(selectedBoard.board_name)
  }, [selectedBoard])

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
  return <div className="bg-white rounded-xl shadow-lg p-6">
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
}