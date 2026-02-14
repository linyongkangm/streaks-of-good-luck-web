'use client'

import { useState, useEffect } from 'react'
import Table, { type Column } from '@/app/widget/Table'
import type { StockBoardWithRelations } from '@/types'
import { formatNumber } from '@/app/tools'
import DatePicker from '@/app/widget/DatePicker'
import { DateTime } from 'luxon'
import { NumberInput } from '@/app/widget/Input'
import Button from '@/app/widget/Button'
import Radio from '@/app/widget/Radio'
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

interface LatestFinancial {
  parent_netprofit_ttm: number | null
  total_parent_equity: number | null
  operate_income_ttm: number | null
  netcash_operate_ttm: number | null
  report_date: string
}

export default function IndustryAnalysisPredictions({ selectedBoard, selectedCompanyId }: Props) {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<PredictRecord[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PredictRecord | null>(null)
  const [latestFinancial, setLatestFinancial] = useState<LatestFinancial | null>(null)
  const [keepMode, setKeepMode] = useState<'value' | 'rate'>('value') // 'value': 保留数值更新增长率, 'rate': 保留增长率更新数值
  const [formData, setFormData] = useState({
    report_date: DateTime.utc() as DateTime,
    parent_netprofit: undefined as number | undefined,
    total_parent_equity: undefined as number | undefined,
    operate_income: undefined as number | undefined,
    netcash_operate: undefined as number | undefined,
  })
  const [growthRates, setGrowthRates] = useState({
    parent_netprofit: undefined as number | undefined,
    total_parent_equity: undefined as number | undefined,
    operate_income: undefined as number | undefined,
    netcash_operate: undefined as number | undefined,
  })
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => {
    fetchPredictions()
    fetchLatestFinancial()
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

  const fetchLatestFinancial = async () => {
    if (!selectedCompanyId) {
      setLatestFinancial(null)
      return
    }

    try {
      const res = await fetch(`/api/financial-statements/view?company_id=${selectedCompanyId}&limit=1`)
      if (res.ok) {
        const result = await res.json()
        if (result.data && result.data.length > 0) {
          setLatestFinancial(result.data[0])
        } else {
          setLatestFinancial(null)
        }
      }
    } catch (error) {
      console.error('获取最新财报失败:', error)
      setLatestFinancial(null)
    }
  }

  // 计算年化增长率
  const calculateGrowthRate = (baseValue: number, predictValue: number, years: number): number => {
    if (baseValue === 0 || years === 0) return 0
    return (Math.pow(predictValue / baseValue, 1 / years) - 1) * 100
  }

  // 根据增长率计算预测值
  const calculatePredictValue = (baseValue: number, growthRate: number, years: number): number => {
    return baseValue * Math.pow(1 + growthRate / 100, years)
  }

  // 计算时间跨度（年）
  const calculateYears = (baseDate: string, predictDate: DateTime): number => {
    const base = DateTime.fromISO(baseDate)
    return predictDate.diff(base, 'years').years
  }

  // 更新具体数值时，同步更新增长率
  const handleValueChange = (key: MetricKey, value: number) => {
    setFormData({ ...formData, [key]: value })

    if (latestFinancial && formData.report_date) {
      const baseValueMap: Record<MetricKey, number | null> = {
        parent_netprofit: latestFinancial.parent_netprofit_ttm,
        total_parent_equity: latestFinancial.total_parent_equity,
        operate_income: latestFinancial.operate_income_ttm,
        netcash_operate: latestFinancial.netcash_operate_ttm,
      }

      const baseValue = baseValueMap[key]
      if (baseValue && baseValue > 0) {
        const years = calculateYears(latestFinancial.report_date, formData.report_date)
        if (years > 0) {
          const rate = calculateGrowthRate(baseValue, value, years)
          setGrowthRates({ ...growthRates, [key]: rate })
        }
      }
    }
  }

  // 更新增长率时，同步更新具体数值
  const handleGrowthRateChange = (key: MetricKey, rate: number) => {
    setGrowthRates({ ...growthRates, [key]: rate })

    if (latestFinancial && formData.report_date) {
      const baseValueMap: Record<MetricKey, number | null> = {
        parent_netprofit: latestFinancial.parent_netprofit_ttm,
        total_parent_equity: latestFinancial.total_parent_equity,
        operate_income: latestFinancial.operate_income_ttm,
        netcash_operate: latestFinancial.netcash_operate_ttm,
      }

      const baseValue = baseValueMap[key]
      if (baseValue && baseValue > 0) {
        const years = calculateYears(latestFinancial.report_date, formData.report_date)
        if (years > 0) {
          const value = calculatePredictValue(baseValue, rate, years)
          setFormData({ ...formData, [key]: value })
        }
      }
    }
  }

  // 更新报告期时，根据keepMode决定更新数值还是增长率
  const handleReportDateChange = (newDate: DateTime) => {
    setFormData({ ...formData, report_date: newDate })

    if (!latestFinancial || !selectedCompanyId) return

    const years = calculateYears(latestFinancial.report_date, newDate)
    if (years <= 0) return

    const baseValueMap: Record<MetricKey, number | null> = {
      parent_netprofit: latestFinancial.parent_netprofit_ttm,
      total_parent_equity: latestFinancial.total_parent_equity,
      operate_income: latestFinancial.operate_income_ttm,
      netcash_operate: latestFinancial.netcash_operate_ttm,
    }

    if (keepMode === 'value') {
      // 保留数值，更新增长率
      const newGrowthRates: any = { ...growthRates }
      Object.keys(metricLabels).forEach((key) => {
        const metricKey = key as MetricKey
        const baseValue = baseValueMap[metricKey]
        const predictValue = formData[metricKey]
        if (baseValue && baseValue > 0 && predictValue) {
          newGrowthRates[metricKey] = calculateGrowthRate(baseValue, predictValue, years)
        }
      })
      setGrowthRates(newGrowthRates)
    } else {
      // 保留增长率，更新数值
      const newFormData: any = { ...formData, report_date: newDate }
      Object.keys(metricLabels).forEach((key) => {
        const metricKey = key as MetricKey
        const baseValue = baseValueMap[metricKey]
        const rate = growthRates[metricKey]
        if (baseValue && baseValue > 0 && rate !== undefined) {
          newFormData[metricKey] = calculatePredictValue(baseValue, rate, years)
        }
      })
      setFormData(newFormData)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    setFormData({
      report_date: DateTime.now(),
      parent_netprofit: undefined,
      total_parent_equity: undefined,
      operate_income: undefined,
      netcash_operate: undefined,
    })
    setGrowthRates({
      parent_netprofit: undefined,
      total_parent_equity: undefined,
      operate_income: undefined,
      netcash_operate: undefined,
    })
    setShowModal(true)
  }

  const handleEdit = (record: PredictRecord) => {
    setEditingRecord(record)
    const newFormData = {
      report_date: DateTime.fromISO(record.report_date),
      parent_netprofit: record.parent_netprofit ?? undefined,
      total_parent_equity: record.total_parent_equity ?? undefined,
      operate_income: record.operate_income ?? undefined,
      netcash_operate: record.netcash_operate ?? undefined,
    }
    setFormData(newFormData)

    // 计算增长率
    if (latestFinancial) {
      const years = calculateYears(latestFinancial.report_date, newFormData.report_date)
      const newGrowthRates: any = {}

      const baseValueMap: Record<MetricKey, number | null> = {
        parent_netprofit: latestFinancial.parent_netprofit_ttm,
        total_parent_equity: latestFinancial.total_parent_equity,
        operate_income: latestFinancial.operate_income_ttm,
        netcash_operate: latestFinancial.netcash_operate_ttm,
      }

      Object.keys(metricLabels).forEach((key) => {
        const metricKey = key as MetricKey
        const baseValue = baseValueMap[metricKey]
        const predictValue = newFormData[metricKey]
        if (baseValue && baseValue > 0 && predictValue && years > 0) {
          newGrowthRates[metricKey] = calculateGrowthRate(baseValue, predictValue, years)
        }
      })

      setGrowthRates(newGrowthRates)
    }

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
      // 构建请求数据
      const body: any = {
        report_date: formData.report_date,
      }

      // 如果是编辑模式，传递id
      if (editingRecord) {
        body.id = editingRecord.id.toString()
      }

      // 添加非空的指标字段
      if (formData.parent_netprofit !== undefined) {
        body.parent_netprofit = formData.parent_netprofit
      }
      if (formData.total_parent_equity !== undefined) {
        body.total_parent_equity = formData.total_parent_equity
      }
      if (formData.operate_income !== undefined) {
        body.operate_income = formData.operate_income
      }
      if (formData.netcash_operate !== undefined) {
        body.netcash_operate = formData.netcash_operate
      }

      if (selectedCompanyId) {
        body.company_id = selectedCompanyId
      } else {
        body.board_id = selectedBoard.id
      }

      const res = await fetch('/api/financial-predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        alert(editingRecord ? '更新成功' : '添加成功')
        setShowModal(false)
        fetchPredictions()
      } else {
        const result = await res.json()
        alert(`提交失败: ${result.error}`)
      }
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
      render: (value: string) => DateTime.fromISO(value).toFormat('yyyy-Qq'),
    },
    {
      title: metricLabels.parent_netprofit,
      dataIndex: 'parent_netprofit',
      render: (value) => formatNumber(value),
    },
    {
      title: metricLabels.total_parent_equity,
      dataIndex: 'total_parent_equity',
      render: (value) => formatNumber(value),
    },
    {
      title: metricLabels.operate_income,
      dataIndex: 'operate_income',
      render: (value) => formatNumber(value),
    },
    {
      title: metricLabels.netcash_operate,
      dataIndex: 'netcash_operate',
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
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <DatePicker mode="quarter" value={formData.report_date} onChange={handleReportDateChange} />
                  </div>
                  {selectedCompanyId && latestFinancial && (
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg">
                      <span className="text-sm text-slate-600">修改报告期时：</span>
                      <Radio
                        options={[
                          { label: '保留数值', value: 'value' },
                          { label: '保留增长率', value: 'rate' },
                        ]}
                        value={keepMode}
                        onChange={setKeepMode}
                      />
                    </div>
                  )}
                </div>
              </div>

              {latestFinancial && (
                <div className="bg-slate-50 p-4 rounded-lg mb-4">
                  <div className="text-sm text-slate-600">
                    <strong>基准：</strong>最新财报 {DateTime.fromISO(latestFinancial.report_date).toFormat('yyyy-Qq')}
                  </div>
                </div>
              )}

              {(Object.keys(metricLabels) as MetricKey[]).map((key) => {
                const baseValueMap: Record<MetricKey, number | null> = latestFinancial ? {
                  parent_netprofit: latestFinancial.parent_netprofit_ttm,
                  total_parent_equity: latestFinancial.total_parent_equity,
                  operate_income: latestFinancial.operate_income_ttm,
                  netcash_operate: latestFinancial.netcash_operate_ttm,
                } : {
                  parent_netprofit: null,
                  total_parent_equity: null,
                  operate_income: null,
                  netcash_operate: null,
                }
                const baseValue = baseValueMap[key]

                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {metricLabels[key]}
                      {baseValue && (
                        <span className="ml-2 text-xs text-slate-500">
                          （最新: {formatNumber(baseValue)}）
                        </span>
                      )}
                    </label>
                    <div className='flex gap-4 items-center'>
                      <NumberInput
                        unit='亿'
                        value={formData[key]}
                        onChange={(value) => handleValueChange(key, value)}
                        decimalPlaces={2}
                        placeholder={`请输入${metricLabels[key]}`}
                      />
                      <NumberInput
                        value={growthRates[key]}
                        onChange={(value) => handleGrowthRateChange(key, value)}
                        placeholder="年化增长率 %"
                        decimalPlaces={2}
                        disabled={!latestFinancial || !selectedCompanyId}
                        suffix="%"
                      />
                    </div>
                  </div>
                )
              })}

              <div className="flex gap-10 mt-6 justify-center">
                <Button
                  look='cancel'
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  look='primary'
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '确定'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
