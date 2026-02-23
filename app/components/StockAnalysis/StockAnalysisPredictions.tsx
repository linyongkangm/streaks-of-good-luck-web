'use client'

import { useState, useEffect, useMemo } from 'react'
import Table, { type Column } from '@/app/widget/Table'
import type { info__stock_company } from '@/types'
import { formatNumber } from '@/app/tools'
import DatePicker from '@/app/widget/DatePicker'
import { DateTime } from 'luxon'
import { NumberInput } from '@/app/widget/Input'
import Button from '@/app/widget/Button'
import Radio from '@/app/widget/Radio'
import Panel from '@/app/widget/Panel'
import ModalForm from '@/app/widget/ModalForm'
import { FormItem, FormLabel } from '@/app/widget/Form'
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
  selectedCompany: info__stock_company
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

function calculateGrowthRate(baseValue: number, predictValue: number, years: number): number {
  if (baseValue === 0 || years === 0) return 0
  return (Math.pow(predictValue / baseValue, 1 / years) - 1) * 100
}

function calculatePredictValue(baseValue: number, growthRate: number, years: number): number {
  return baseValue * Math.pow(1 + growthRate / 100, years)
}

function calculateYears(baseDate: string, predictDate: DateTime): number {
  const base = DateTime.fromISO(baseDate)
  return predictDate.diff(base, 'years').years
}

export default function StockAnalysisPredictions({ selectedCompany }: Props) {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<PredictRecord[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PredictRecord | null>(null)
  const [latestFinancial, setLatestFinancial] = useState<LatestFinancial | null>(null)
  const [keepMode, setKeepMode] = useState<'value' | 'rate'>('value')
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

  useEffect(() => {
    fetchPredictions()
    fetchLatestFinancial()
  }, [selectedCompany])

  const panelTitle = useMemo(() => {
    return selectedCompany.company_name + ' - 财务预测数据'
  }, [selectedCompany])

  const fetchPredictions = async () => {
    if (!selectedCompany?.id) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('company_id', selectedCompany.id.toString())

      const res = await fetch(`/api/stock-predictions?${params}`)
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
    if (!selectedCompany?.id) {
      setLatestFinancial(null)
      return
    }

    try {
      const res = await fetch(`/api/financial-statements/view?company_id=${selectedCompany.id}&limit=1`)
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

  const handleReportDateChange = (newDate: DateTime) => {
    setFormData({ ...formData, report_date: newDate })

    if (!latestFinancial || !selectedCompany?.id) return

    const years = calculateYears(latestFinancial.report_date, newDate)
    if (years <= 0) return

    const baseValueMap: Record<MetricKey, number | null> = {
      parent_netprofit: latestFinancial.parent_netprofit_ttm,
      total_parent_equity: latestFinancial.total_parent_equity,
      operate_income: latestFinancial.operate_income_ttm,
      netcash_operate: latestFinancial.netcash_operate_ttm,
    }

    if (keepMode === 'value') {
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
      const res = await fetch('/api/stock-predictions', {
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

  const handleSubmit = async (e: React.FormEvent, values: Record<string, any>) => {
    if (!formData.report_date) {
      alert('请填写报告期')
      return
    }

    try {
      const body: any = {
        report_date: formData.report_date,
      }

      if (editingRecord) {
        body.id = editingRecord.id.toString()
      }

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

      body.company_id = selectedCompany.id

      const res = await fetch('/api/stock-predictions', {
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
    }
  }

  const columns: Column<PredictRecord>[] = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      width: '120px',
      render: (value: string) => DateTime.fromISO(value).toFormat('yyyy-Qq'),
    },
    ...(Object.keys(metricLabels) as MetricKey[]).map((key) => ({
      title: metricLabels[key],
      dataIndex: key,
      render: (value: number | undefined) => formatNumber(value),
    })),
    {
      title: '操作',
      dataIndex: 'operation',
      width: '150px',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            onClick={() => handleEdit(record)}
            look="primary"
            size="tiny"
          >
            编辑
          </Button>
          <Button
            onClick={() => handleDelete(record)}
            look="danger"
            size="tiny"
          >
            删除
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Panel
      title={panelTitle}
      headerAction={
        <Button
          onClick={handleAdd}
          look='primary'
          size='small'
        >
          添加预测
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={predictions}
        loading={loading}
        emptyText="暂无预测数据"
      />

      <ModalForm
        key={editingRecord?.id?.toString() || 'new'}
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`${editingRecord ? '编辑' : '添加'}财务预测`}
        initialValues={formData}
        onSubmit={handleSubmit}
      >
        <FormLabel label="预测报告期" required>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <FormItem field="report_date" onChange={handleReportDateChange}>
                <DatePicker mode="quarter" />
              </FormItem>
            </div>
            {latestFinancial && (
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
        </FormLabel>

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
            <FormLabel
              key={key}
              label={
                <>
                  {metricLabels[key]}
                  {baseValue && (
                    <span className="ml-2 text-xs text-slate-500">
                      （最新: {formatNumber(baseValue)}）
                    </span>
                  )}
                </>
              }
            >
              <div className='flex gap-4 items-center'>
                <FormItem field={key} onChange={(value) => handleValueChange(key, value)}>
                  <NumberInput
                    unit='亿'
                    decimalPlaces={2}
                    placeholder={`请输入${metricLabels[key]}`}
                  />
                </FormItem>
                <NumberInput
                  value={growthRates[key]}
                  onChange={(value) => handleGrowthRateChange(key, value)}
                  placeholder="年化增长率 %"
                  decimalPlaces={2}
                  disabled={!latestFinancial}
                  suffix="%"
                />
              </div>
            </FormLabel>
          )
        })}
      </ModalForm>
    </Panel>
  )
}
