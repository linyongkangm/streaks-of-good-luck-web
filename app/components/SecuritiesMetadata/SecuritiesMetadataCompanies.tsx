'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'
import Table, { Column } from '@/app/widget/Table'

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
    company_akshare_code: '',
    industry: '',
    ipo_date: '',
    total_shares: '',
    circulating_shares: '',
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
    if (!formData.company_akshare_code) {
      alert('请输入AKShare代码')
      return
    }

    setFetchingMetadata(true)
    try {
      const res = await fetch('/api/stock-metadata/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: formData.company_akshare_code }),
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
    if (!formData.company_name || !formData.company_code || !formData.company_akshare_code) {
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
        body: JSON.stringify(formData),
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
      company_akshare_code: company.company_akshare_code,
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
          symbol: selectedCompany.company_akshare_code,
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
      company_akshare_code: '',
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
    },
    {
      title: '公司名称',
      dataIndex: 'company_name',
    },
    {
      title: '行业',
      dataIndex: 'industry',
    },
    {
      title: '上市日期',
      dataIndex: 'ipo_date',
    },
    {
      title: '操作',
      dataIndex: 'operations',
      render(_, company) {
        return <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(company)
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-medium mr-2"
          >
            编辑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelectCompany(company)
              setQuoteParams({
                start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
              })
              setShowQuoteForm(true)
            }}
            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-xs font-medium mr-2"
          >
            获取行情
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleFetchFinancials(company)
            }}
            disabled={fetchingFinancials}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-xs font-medium mr-2 disabled:opacity-50"
          >
            {fetchingFinancials ? '获取中...' : '获取财报'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(company.id)
            }}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-xs font-medium"
          >
            删除
          </button>
        </>
      }
    }
  ]
  return (
    <div className="mx-auto">
      <div className="w-full">
        {/* 搜索和操作栏 */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="搜索公司名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchCompanies()}
            className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-900"
          />
          <button
            onClick={fetchCompanies}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            搜索
          </button>
          <button
            onClick={() => {
              resetForm()
              setEditingCompany(null)
              setShowForm(true)
            }}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            + 添加公司
          </button>
        </div>

        {/* 公司列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
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
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-medium text-slate-900"
            >
              ← 上一页
            </button>
            <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-md">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-medium text-slate-900"
            >
              下一页 →
            </button>
          </div>
        )}
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <h3 className="text-2xl font-bold">{editingCompany ? '编辑公司' : '添加公司'}</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* AKShare代码和获取元数据 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  AKShare代码 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.company_akshare_code}
                    onChange={(e) => setFormData({ ...formData, company_akshare_code: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    placeholder="例如: 000001"
                  />
                  <button
                    onClick={handleFetchMetadata}
                    disabled={fetchingMetadata || !formData.company_akshare_code}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap"
                  >
                    {fetchingMetadata ? '获取中...' : '获取元数据'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    公司名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    股票代码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_code}
                    onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">行业</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">上市日期</label>
                  <input
                    type="date"
                    value={formData.ipo_date}
                    onChange={(e) => setFormData({ ...formData, ipo_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">总股本</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_shares}
                    onChange={(e) => setFormData({ ...formData, total_shares: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">流通股</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.circulating_shares}
                    onChange={(e) => setFormData({ ...formData, circulating_shares: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingCompany(null)
                  resetForm()
                }}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                {editingCompany ? '更新' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 行情获取弹窗 */}
      {showQuoteForm && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
              <h3 className="text-2xl font-bold">获取历史行情</h3>
              <p className="text-sm text-green-100 mt-1">{selectedCompany.company_name} ({selectedCompany.company_code})</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  开始日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={quoteParams.start_date}
                  onChange={(e) => setQuoteParams({ ...quoteParams, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  结束日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={quoteParams.end_date}
                  onChange={(e) => setQuoteParams({ ...quoteParams, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">💡 说明</p>
                <p>将获取该时间段内的历史行情数据，包含不复权、前复权、后复权三种数据。</p>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowQuoteForm(false)
                  onSelectCompany(null)
                }}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                disabled={fetchingQuotes}
              >
                取消
              </button>
              <button
                onClick={handleFetchQuotes}
                disabled={fetchingQuotes}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fetchingQuotes ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    获取中...
                  </>
                ) : (
                  '开始获取'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}