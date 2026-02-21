'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'
import { DateTime } from 'luxon'
import Table, { Column } from '@/app/widget/Table'
import Button from '@/app/widget/Button'
import { TextInput } from '@/app/widget/Input'
import Select from '@/app/widget/Select'
import DatePicker from '@/app/widget/DatePicker'
import ModalForm from '@/app/widget/ModalForm'
import { FormItem, FormLabel } from '@/app/widget/Form'
import Loading from '@/app/widget/Loading'
import Panel from '@/app/widget/Panel'
import * as tools from '@/app/tools'
interface Props {
  selectedCompany: info__stock_company | null
  onSelectCompany: (company: info__stock_company | null) => void
}

export default function SecuritiesMetadataCompanies({ selectedCompany, onSelectCompany }: Props) {
  const [companies, setCompanies] = useState<info__stock_company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<info__stock_company | null>(null)
  const [formData, setFormData] = useState({
    company_name: '',
    company_code: '',
    industry: '',
    ipo_date: '',
    total_shares: '',
    circulating_shares: '',
    company_akshare_exchange: 'sz',
  })
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quoteParams, setQuoteParams] = useState({
    start_date: '',
    end_date: '',
  })
  const [fetchingQuotes, setFetchingQuotes] = useState(false)
  const [fetchingFinancials, setFetchingFinancials] = useState(false)

  useEffect(() => {
    fetchCompanies()
  }, [page, search])

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.append('name', search)

      const res = await fetch(`/api/stock-companies?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.data)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('获取公司列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchMetadata = async () => {
    if (!formData.company_code || !formData.company_akshare_exchange) {
      alert('请输入AKShare代码')
      return
    }

    setFetchingMetadata(true)
    try {
      const res = await fetch('/api/stock-metadata/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: formData.company_akshare_exchange + formData.company_code }),
      })

      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          setFormData({
            ...formData,
            company_name: result.data.company_name || formData.company_name,
            company_code: result.data.company_code || formData.company_code,
            industry: result.data.industry || formData.industry,
            ipo_date: result.data.ipo_date || formData.ipo_date,
            total_shares: result.data.total_shares?.toString() || formData.total_shares,
            circulating_shares: result.data.circulating_shares?.toString() || formData.circulating_shares,
          })
          alert('元数据获取成功')
        } else {
          alert('获取元数据失败')
        }
      } else {
        alert('获取元数据失败')
      }
    } catch (error) {
      console.error('获取元数据失败:', error)
      alert('获取元数据失败')
    } finally {
      setFetchingMetadata(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.company_name || !formData.company_code || !formData.company_akshare_exchange) {
      alert('请填写必填字段')
      return
    }

    try {
      const url = editingCompany
        ? `/api/stock-companies/${editingCompany.id}`
        : '/api/stock-companies'
      const method = editingCompany ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          company_akshare_code: formData.company_akshare_exchange + formData.company_code,
        }),
      })

      if (res.ok) {
        alert(editingCompany ? '更新成功' : '创建成功')
        setShowForm(false)
        setEditingCompany(null)
        resetForm()
        fetchCompanies()
      } else {
        const error = await res.json()
        alert(error.error || '操作失败')
      }
    } catch (error) {
      console.error('操作失败:', error)
      alert('操作失败')
    }
  }

  const handleEdit = (company: info__stock_company) => {
    setEditingCompany(company)
    setFormData({
      company_name: company.company_name,
      company_code: company.company_code,
      company_akshare_exchange: company.company_akshare_code.replace(company.company_code, ''),
      industry: company.industry || '',
      ipo_date: company.ipo_date ? new Date(company.ipo_date).toISOString().split('T')[0] : '',
      total_shares: company.total_shares?.toString() || '',
      circulating_shares: company.circulating_shares?.toString() || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个公司吗？')) return

    try {
      const res = await fetch(`/api/stock-companies/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('删除成功')
        fetchCompanies()
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
  }
  const handleFetchQuotes = async () => {
    if (!selectedCompany) return

    if (!quoteParams.start_date || !quoteParams.end_date) {
      alert('请选择开始和结束日期')
      return
    }

    setFetchingQuotes(true)
    try {
      const res = await fetch('/api/stock-quotes/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          start_date: quoteParams.start_date,
          end_date: quoteParams.end_date,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        alert(result.message || '行情数据获取成功')
        setShowQuoteForm(false)
        onSelectCompany(null)
        setQuoteParams({ start_date: '', end_date: '' })
      } else {
        const error = await res.json()
        alert(error.error || '获取行情数据失败')
      }
    } catch (error) {
      console.error('获取行情数据失败:', error)
      alert('获取行情数据失败')
    } finally {
      setFetchingQuotes(false)
    }
  }

  const handleFetchFinancials = async (company: info__stock_company) => {
    if (!confirm(`确定要获取 ${company.company_name} 的财报数据吗？`)) return

    setFetchingFinancials(true)
    try {
      const res = await fetch('/api/financial-statements/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      })

      if (res.ok) {
        const result = await res.json()
        alert(`财报数据获取成功！\n资产负债表: ${result.counts.balanceSheet} 条\n利润表: ${result.counts.profitSheet} 条\n现金流量表: ${result.counts.cashFlowSheet} 条`)
      } else {
        const error = await res.json()
        alert(error.error || '获取财报数据失败')
      }
    } catch (error) {
      console.error('获取财报数据失败:', error)
      alert('获取财报数据失败')
    } finally {
      setFetchingFinancials(false)
    }
  }

  const resetForm = () => {
    setFormData({
      company_name: '',
      company_code: '',
      company_akshare_exchange: 'sz',
      industry: '',
      ipo_date: '',
      total_shares: '',
      circulating_shares: '',
    })
  }
  const columns: Column<info__stock_company>[] = [
    {
      title: '股票代码',
      dataIndex: 'company_code',
    }, {
      title: 'akshare代码',
      dataIndex: 'company_akshare_code',
    },
    {
      title: '公司名称',
      dataIndex: 'company_name',
    },
    {
      title: '总股本',
      dataIndex: 'total_shares',
      render: (value: any) => (tools.formatNumber(value))
    },
    {
      title: '上市日期',
      dataIndex: 'ipo_date',
      render: (value: any) => (
        value ? new Date(value).toISOString().split('T')[0] : ''
      )
    },
    {
      title: '操作',
      dataIndex: 'operations',
      render(_, company) {
        return <div className="flex gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(company)
            }}
            size="tiny"
            className="mr-2"
          >
            编辑
          </Button>
          <Button
            onClick={async (e) => {
              e.stopPropagation()
              onSelectCompany(company)

              // 获取公司的最新行情日期
              try {
                const res = await fetch(`/api/stock-quotes?company_id=${company.id}&limit=1`)
                if (res.ok) {
                  const data = await res.json()
                  let startDate: string

                  if (data.data && data.data.length > 0) {
                    // 有历史数据，从最新日期的下一天开始
                    const latestDate = new Date(data.data[0].trade_date)
                    latestDate.setDate(latestDate.getDate() + 1)
                    startDate = latestDate.toISOString().split('T')[0]
                  } else {
                    // 没有历史数据，从30天前开始
                    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  }

                  setQuoteParams({
                    start_date: startDate,
                    end_date: new Date().toISOString().split('T')[0],
                  })
                } else {
                  // 查询失败，使用默认值
                  setQuoteParams({
                    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end_date: new Date().toISOString().split('T')[0],
                  })
                }
              } catch (error) {
                console.error('获取最新行情日期失败:', error)
                // 出错使用默认值
                setQuoteParams({
                  start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  end_date: new Date().toISOString().split('T')[0],
                })
              }

              setShowQuoteForm(true)
            }}
            look="success"
            size="tiny"
            className="mr-2"
          >
            获取行情
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              handleFetchFinancials(company)
            }}
            disabled={fetchingFinancials}
            look="secondary"
            size="tiny"
            className="mr-2"
          >
            {fetchingFinancials ? '获取中...' : '获取财报'}
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(company.id)
            }}
            look="danger"
            size="tiny"
          >
            删除
          </Button>
        </div>
      }
    }
  ]
  return (
    <Panel title="📊 证券元数据管理">
      <div className="mx-auto">
        <div className="w-full">
          {/* 搜索和操作栏 */}
          <div className="flex gap-4 mb-6">
            <TextInput
              placeholder="搜索公司名称..."
              value={search}
              onChange={setSearch}
              className="flex-1 py-3"
            />
            <Button
              onClick={fetchCompanies}
              size="medium"
            >
              搜索
            </Button>
            <Button
              onClick={() => {
                resetForm()
                setEditingCompany(null)
                setShowForm(true)
              }}
              look="success"
              size="medium"
            >
              + 添加公司
            </Button>
          </div>

          {/* 公司列表 */}
          {loading ? (
            <Loading />
          ) : companies.length === 0 ? (
            <div className="text-center py-12 text-slate-500">暂无数据</div>
          ) : (
            <Table
              columns={columns}
              dataSource={companies}
              loading={loading}
              emptyText="暂无现金流量表数据"
              onRow={(company) => {
                return {
                  onClick: () => {
                    onSelectCompany(company)
                  }
                }
              }}
            >
            </Table>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                look="cancel"
                size="small"
              >
                ← 上一页
              </Button>
              <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-md">
                {page} / {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                look="cancel"
                size="small"
              >
                下一页 →
              </Button>
            </div>
          )}
        </div>

        {/* 表单弹窗 */}
        <ModalForm
          open={showForm}
          onClose={() => {
            setShowForm(false)
            setEditingCompany(null)
            resetForm()
          }}
          title={editingCompany ? '编辑公司' : '添加公司'}
          maxWidth="2xl"
          values={formData}
          onValuesChange={setFormData}
          onSubmit={async () => {
            await handleSubmit()
          }}
          submitText={editingCompany ? '更新' : '创建'}
          footer={(submitting, onClose) => (
            <div className="border-t border-slate-200 pt-4 mt-6 flex justify-end gap-3">
              <Button
                onClick={() => {
                  onClose()
                  setEditingCompany(null)
                  resetForm()
                }}
                look="cancel"
                size="small"
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" size="small" disabled={submitting}>
                {editingCompany ? '更新' : '创建'}
              </Button>
            </div>
          )}
        >
          <div className="space-y-4">
            <FormLabel label="AKShare代码" required>
              <div className="flex gap-2">
                <FormItem field="company_akshare_exchange">
                  <Select
                    options={[
                      { label: '深交所', value: 'sz' },
                      { label: '上交所', value: 'sh' },
                    ]}
                    className="w-40"
                  />
                </FormItem>
                <FormItem field="company_code">
                  <TextInput className="flex-1" placeholder="例如: 000001" />
                </FormItem>
                <Button
                  onClick={handleFetchMetadata}
                  disabled={fetchingMetadata || !formData.company_code}
                  look="secondary"
                  size="small"
                  className="whitespace-nowrap"
                >
                  {fetchingMetadata ? '获取中...' : '获取元数据'}
                </Button>
              </div>
            </FormLabel>

            <div className="grid grid-cols-2 gap-4">
              <FormLabel label="公司名称" required>
                <FormItem field="company_name">
                  <TextInput />
                </FormItem>
              </FormLabel>
              <FormLabel label="行业">
                <FormItem field="industry">
                  <TextInput />
                </FormItem>
              </FormLabel>

              <FormLabel label="上市日期">
                <DatePicker
                  mode="date"
                  value={formData.ipo_date ? DateTime.fromISO(formData.ipo_date) : undefined}
                  onChange={(value) => setFormData({ ...formData, ipo_date: value.toFormat('yyyy-MM-dd') })}
                  className="w-full"
                />
              </FormLabel>
              <FormLabel label="总股本">
                <FormItem field="total_shares">
                  <TextInput />
                </FormItem>
              </FormLabel>

              <FormLabel label="流通股">
                <FormItem field="circulating_shares">
                  <TextInput />
                </FormItem>
              </FormLabel>
            </div>
          </div>
        </ModalForm>

        {/* 行情获取弹窗 */}
        <ModalForm
          open={showQuoteForm && !!selectedCompany}
          onClose={() => {
            setShowQuoteForm(false)
            onSelectCompany(null)
          }}
          title="获取历史行情"
          maxWidth="md"
          values={quoteParams}
          onValuesChange={setQuoteParams}
          onSubmit={async () => {
            await handleFetchQuotes()
          }}
          submitText="开始获取"
          footer={(submitting, onClose) => (
            <div className="border-t border-slate-200 pt-4 mt-6 flex justify-end gap-3">
              <Button
                onClick={() => {
                  onClose()
                  onSelectCompany(null)
                }}
                look="cancel"
                size="small"
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting} look="success" size="small">
                {submitting ? '获取中...' : '开始获取'}
              </Button>
            </div>
          )}
        >
          {selectedCompany && (
            <>
              <p className="text-sm text-slate-600 mb-4">{selectedCompany.company_name} ({selectedCompany.company_code})</p>
              <div className="space-y-4">
                <FormLabel label="开始日期" required>
                  <DatePicker
                    mode="date"
                    value={quoteParams.start_date ? DateTime.fromISO(quoteParams.start_date) : undefined}
                    onChange={(value) => setQuoteParams({ ...quoteParams, start_date: value.toFormat('yyyy-MM-dd') })}
                    className="w-full"
                  />
                </FormLabel>

                <FormLabel label="结束日期" required>
                  <DatePicker
                    mode="date"
                    value={quoteParams.end_date ? DateTime.fromISO(quoteParams.end_date) : undefined}
                    onChange={(value) => setQuoteParams({ ...quoteParams, end_date: value.toFormat('yyyy-MM-dd') })}
                    className="w-full"
                  />
                </FormLabel>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">💡 说明</p>
                  <p>将获取该时间段内的历史行情数据，包含不复权、前复权、后复权三种数据。</p>
                </div>
              </div>
            </>
          )}
        </ModalForm>
      </div>
    </Panel>
  )
}