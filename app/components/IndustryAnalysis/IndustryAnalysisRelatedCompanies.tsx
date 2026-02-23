'use client'

import { useState, useEffect, useMemo } from 'react'
import type {
  StockBoardWithRelations,
  info__stock_company
} from '@/types'
import Table, { Column } from '@/app/widget/Table'
import Panel from '@/app/widget/Panel'
import Button from '@/app/widget/Button'
import ModalForm from '@/app/widget/ModalForm'
import { FormItem, FormLabel } from '@/app/widget/Form'
import Select from '@/app/widget/Select'
import { NumberInput } from '@/app/widget/Input'
interface Props {
  selectedBoard: StockBoardWithRelations;
  fetchBoards: () => Promise<void>;
  fetchBoardDetail: (boardId: number) => Promise<void>;
  selectedCompanyId: number | null;
  setSelectedCompanyId: (id: number | null) => void;
}

export default function IndustryAnalysisRelatedCompanies({ selectedBoard, fetchBoards, fetchBoardDetail, selectedCompanyId, setSelectedCompanyId }: Props) {
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false)
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null)
  const [editWeightValue, setEditWeightValue] = useState('')
  const [allCompanies, setAllCompanies] = useState<info__stock_company[]>([])

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
  const handleAddCompany = async (e: React.FormEvent, values: Record<string, any>) => {
    console.log('Adding company with values:', values)
    if (!selectedBoard || !values.company_id) return
    try {
      const response = await fetch('/api/board-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board_id: selectedBoard.id,
          company_id: Number(values.company_id),
          weight: values.weight || 0,
        }),
      })
      if (response.ok) {
        await fetchBoardDetail(selectedBoard.id)
        setShowAddCompanyModal(false)
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

  const columns: Column<any>[] = [
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
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditWeightValue(e.target.value)}
                className="text-slate-900 w-20 px-2 py-1 border-2 border-blue-500 rounded"
                step="1"
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleUpdateWeight(record.id, editWeightValue); }}
                className="px-2 py-1 bg-green-500 text-white rounded text-xs"
              >
                ✓
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingWeightId(null); }}
                className="px-2 py-1 bg-gray-400 text-white rounded text-xs"
              >
                ✕
              </button>
            </div>
          )
        }
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
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
        <Button
          look="danger"
          size='tiny'
          onClick={() => handleRemoveCompany(record.id)}
          className='inline-flex items-center'
        >
          移除
        </Button>
      ),
    },
  ]

  return <Panel
    title={`关联公司 (${selectedBoard.relation__stock_board_company.length})`}
    headerAction={[
      <Button key="add-company" size='small' onClick={() => setShowAddCompanyModal(true)}>添加公司</Button>
    ]}>
    <Table
      columns={columns}
      dataSource={selectedBoard.relation__stock_board_company}
      emptyText="暂无关联公司"
      rowClassName={(record: any) =>
        selectedCompanyId === record.company_id ? 'bg-blue-50' : ''
      }
      onRow={(record: any) => ({
        onClick: () => {
          setSelectedCompanyId(
            selectedCompanyId === record.company_id ? null : record.company_id
          )
        },
        style: { cursor: 'pointer' },
      })}
    />

    {/* 添加公司模态框 */}
    <ModalForm
      open={showAddCompanyModal}
      title="添加公司到板块"
      onClose={() => setShowAddCompanyModal(false)}
      onSubmit={handleAddCompany}
    >
      <FormLabel label="选择公司" required>
        <FormItem field='company_id'>
          <Select options={
            allCompanies
              .filter(company =>
                !selectedBoard?.relation__stock_board_company.some(
                  rel => rel.company_id === company.id
                )
              )
              .map((company) => ({
                label: `${company.company_code} - ${company.company_name}`,
                value: company.id,
                key: company.id,
              }))
          }>
          </Select>
        </FormItem>
      </FormLabel>
      <FormLabel label="权重" required>
        <FormItem field='weight'>
          <NumberInput></NumberInput>
        </FormItem>
      </FormLabel>
    </ModalForm>
  </Panel>
}