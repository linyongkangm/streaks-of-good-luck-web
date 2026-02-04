'use client'

import { useState, useEffect, use, useMemo } from 'react'
import type {
  info__stock_board,
  StockBoardWithRelations,
  info__stock_company
} from '@/types'
import Table from '@/app/widget/Table'

interface Props {
  selectedBoard: StockBoardWithRelations;
  fetchBoards: () => Promise<void>;
  fetchBoardDetail: (boardId: number) => Promise<void>;
}

export default function IndustryAnalysisRelatedCompanies({ selectedBoard, fetchBoards, fetchBoardDetail }: Props) {
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false)
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null)
  const [editWeightValue, setEditWeightValue] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [allCompanies, setAllCompanies] = useState<info__stock_company[]>([])
  const [newCompanyWeight, setNewCompanyWeight] = useState('0')
  const fetchAllCompanies = async () => {
    try {
      const response = await fetch('/api/stock-companies?limit=1000')
      const data = await response.json()
      setAllCompanies(data.data || [])
    } catch (error) {
      console.error('Failed to fetch companies:', error)
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

  useEffect(() => {
    fetchAllCompanies()
  }, [])
  const totalWeight = useMemo(() => {
    if (!selectedBoard) return 0
    return selectedBoard.relation__stock_board_company.reduce((sum, company) => sum + Number(company.weight), 0)
  }, [selectedBoard])

  const columns = [
    {
      title: '公司代码',
      dataIndex: 'company_code',
      render: (_: any, record: any) => record.info__stock_company.company_code,
    },
    {
      title: '公司名称',
      dataIndex: 'company_name',
      render: (_: any, record: any) => record.info__stock_company.company_name,
    },
    {
      title: '权重',
      dataIndex: 'weight',
      render: (_: any, record: any) => {
        if (editingWeightId === record.id) {
          return (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editWeightValue}
                onChange={(e) => setEditWeightValue(e.target.value)}
                className="text-slate-900 w-20 px-2 py-1 border-2 border-blue-500 rounded"
                step="1"
              />
              <button
                onClick={() => handleUpdateWeight(record.id, editWeightValue)}
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
          )
        }
        return (
          <button
            onClick={() => {
              setEditingWeightId(record.id)
              setEditWeightValue(record.weight.toString())
            }}
            className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200"
          >
            {((Number(record.weight) / totalWeight) * 100).toFixed(2)}% ✏️
          </button>
        )
      },
    },
    {
      title: '操作',
      dataIndex: 'action',
      render: (_: any, record: any) => (
        <button
          onClick={() => handleRemoveCompany(record.id)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
        >
          移除
        </button>
      ),
    },
  ]

  return <div className="bg-white rounded-xl shadow-lg p-6">
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

    <Table
      columns={columns}
      dataSource={selectedBoard.relation__stock_board_company}
      emptyText="暂无关联公司"
    />

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
}