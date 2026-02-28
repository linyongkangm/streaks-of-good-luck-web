'use client'

import type { IndustryWithCount } from '@/types'
import Button from '@/app/widget/Button'

interface IndustryAnalysisIndustryListProps {
  industries: IndustryWithCount[]
  loading: boolean
  searchName: string
  onSearchNameChange: (name: string) => void
  onSearch: () => void
  selectedIndustryId: number | null
  onSelectIndustry: (id: number) => void
  onCreateIndustry: () => void
  onEditIndustry: (industry: IndustryWithCount) => void
  onDeleteIndustry: (industry: IndustryWithCount) => void
}

export default function IndustryAnalysisIndustryList({
  industries,
  loading,
  searchName,
  onSearchNameChange,
  onSearch,
  selectedIndustryId,
  onSelectIndustry,
  onCreateIndustry,
  onEditIndustry,
  onDeleteIndustry,
}: IndustryAnalysisIndustryListProps) {
  return (
    <div className="w-80 flex-shrink-0 flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-lg p-5">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          🏭 行业列表
        </h2>

        {/* 搜索 + 新建 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="搜索行业..."
            value={searchName}
            onChange={(e) => onSearchNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none text-slate-900"
          />
          <Button size="small" look="success" onClick={onCreateIndustry}>＋</Button>
        </div>

        {/* 行业列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-500 border-t-transparent"></div>
          </div>
        ) : industries.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">暂无行业</div>
        ) : (
          <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto">
            {industries.map((industry) => (
              <div
                key={industry.id}
                onClick={() => onSelectIndustry(industry.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  selectedIndustryId === industry.id
                    ? 'bg-teal-50 border border-teal-200 text-teal-800'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{industry.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {industry._count.relation__industry_articles}篇
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditIndustry(industry) }}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteIndustry(industry) }}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
