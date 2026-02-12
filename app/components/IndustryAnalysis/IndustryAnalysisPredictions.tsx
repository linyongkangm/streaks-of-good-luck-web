'use client'

import { useState, useEffect } from 'react'
import Table, { type Column } from '@/app/widget/Table'
import type { StockBoardWithRelations } from '@/types'
import { formatNumber } from '@/app/tools'
interface PredictRecord {
  id: string | bigint
  company_id: number | null
  board_id: number | null
  report_date: string
  parent_netprofit: number | null
  total_parent_equity: number | null
  operate_income: number | null
  netcash_operate: number | null
  create_time: string
  update_time: string
}

interface Props {
  selectedBoard: StockBoardWithRelations
  selectedCompanyId: number | null
}

type MetricKey = 'parent_netprofit' | 'total_parent_equity' | 'operate_income' | 'netcash_operate'

const metricLabels: Record<MetricKey, string> = {
  parent_netprofit: '归属母公司净利润',
  total_parent_equity: '归属母公司股东权益',
  operate_income: '营业总收入',
  netcash_operate: '经营活动现金流净额',
}

export default function IndustryAnalysisPredictions({ selectedBoard, selectedCompanyId }: Props) {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<PredictRecord[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PredictRecord | null>(null)
  const [formData, setFormData] = useState({
    report_date: '',
    parent_netprofit: '',
    total_parent_equity: '',
    operate_income: '',
    netcash_operate: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchPredictions()
  }, [selectedBoard, selectedCompanyId])

  const fetchPredictions = async () => {
    if (!selectedBoard?.id) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (selectedCompanyId) {
        params.append('company_id', selectedCompanyId.toString())
      } else {
        params.append('board_id', selectedBoard.id.toString())
      }

      const res = await fetch(`/api/financial-predictions?${params}`)
      if (res.ok) {
        const result = await res.json()
        setPredictions(result.data || [])
      }
    } catch (error) {
      console.error('获取预测数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    setFormData({
      report_date: '',
      parent_netprofit: '',
      total_parent_equity: '',
      operate_income: '',
      netcash_operate: '',
    })
    setShowModal(true)
  }

  const handleEdit = (record: PredictRecord) => {
    setEditingRecord(record)
    setFormData({
      report_date: new Date(record.report_date).toISOString().split('T')[0],
      parent_netprofit: record.parent_netprofit?.toString() || '',
      total_parent_equity: record.total_parent_equity?.toString() || '',
      operate_income: record.operate_income?.toString() || '',
      netcash_operate: record.netcash_operate?.toString() || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (record: PredictRecord) => {
    if (!confirm('确定要删除这条预测数据吗？')) return

    try {
      const res = await fetch('/api/financial-predictions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: record.id.toString() }),
      })

      if (res.ok) {
        alert('删除成功')
        fetchPredictions()
      } else {
        const result = await res.json()
        alert(`删除失败: ${result.error}`)
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.report_date) {
      alert('请填写报告期')
      return
    }

    setSubmitting(true)
    try {
      // 如果是编辑模式，需要先删除旧记录，再创建新记录（因为报告期可能变化）
      if (editingRecord) {
        await fetch('/api/financial-predictions', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: editingRecord.id.toString() }),
        })
      }

      // 为每个非空的指标创建/更新记录
      const metricKeys: MetricKey[] = ['parent_netprofit', 'total_parent_equity', 'operate_income', 'netcash_operate']
      const metricTypeMap: Record<MetricKey, string> = {
        parent_netprofit: 'pe',
        total_parent_equity: 'pb',
        operate_income: 'ps',
        netcash_operate: 'pc',
      }

      for (const key of metricKeys) {
        const value = formData[key]
        if (value && value.trim() !== '') {
          const body: any = {
            report_date: formData.report_date,
            metric_type: metricTypeMap[key],
            metric_value: parseFloat(value),
          }

          if (selectedCompanyId) {
            body.company_id = selectedCompanyId
          } else {
            body.board_id = selectedBoard.id
          }

          await fetch('/api/financial-predictions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          })
        }
      }

      alert(editingRecord ? '更新成功' : '添加成功')
      setShowModal(false)
      fetchPredictions()
    } catch (error) {
      console.error('提交失败:', error)
      alert('提交失败')
    } finally {
      setSubmitting(false)
    }
  }



  const columns: Column<PredictRecord>[] = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      width: '120px',
      render: (value) => new Date(value).toISOString().split('T')[0],
    },
    {
      title: metricLabels.parent_netprofit,
      dataIndex: 'parent_netprofit',
      align: 'right',
      render: (value) => formatNumber(value),
    },
    {
      title: metricLabels.total_parent_equity,
      dataIndex: 'total_parent_equity',
      align: 'right',
      render: (value) => formatNumber(value),
    },
    {
      title: metricLabels.operate_income,
      dataIndex: 'operate_income',
      align: 'right',
      render: (value) => formatNumber(value),
    },
    {
      title: metricLabels.netcash_operate,
      dataIndex: 'netcash_operate',
      align: 'right',
      render: (value) => formatNumber(value),
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: '150px',
      render: (_, record) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(record)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            编辑
          </button>
          <button
            onClick={() => handleDelete(record)}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
          >
            删除
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">
          {selectedCompanyId 
            ? selectedBoard.relation__stock_board_company.find(c => c.company_id === selectedCompanyId)?.info__stock_company?.company_name 
            : selectedBoard.board_name} - 财务预测数据
        </h2>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          添加预测
        </button>
      </div>

      <Table
        columns={columns}
        dataSource={predictions}
        loading={loading}
        emptyText="暂无预测数据"
      />

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              {editingRecord ? '编辑' : '添加'}财务预测
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  预测报告期 *
                </label>
                <input
                  type="date"
                  value={formData.report_date}
                  onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              {(Object.keys(metricLabels) as MetricKey[]).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {metricLabels[key]}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    placeholder={`请输入${metricLabels[key]}`}
                  />
                </div>
              ))}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all"
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '确定'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
