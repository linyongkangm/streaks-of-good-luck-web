'use client'

import type {
  info__stock_company,
} from '@/types'

interface Props {
  companies: info__stock_company[];
  selectedCompany: info__stock_company | null;
  onSelectCompany: (company: info__stock_company) => void;
}

/* 个股列表 */
export default function StockAnalysisStockList({ companies, selectedCompany, onSelectCompany }: Props) {
  return <div className="bg-white rounded-xl shadow-lg p-6 sticky">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        个股列表
      </h2>
    </div>
    <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin pr-2">
      {companies.map((company) => (
        <div key={company.id} className="relative group">
          <button
            onClick={() => onSelectCompany(company)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${selectedCompany?.id === company.id
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-md'
              }`}
          >
            <div className="font-medium">{company.company_name}</div>
            <div className={`text-xs ${selectedCompany?.id === company.id ? 'text-blue-100' : 'text-slate-500'}`}>
              {company.company_code}
            </div>
          </button>
        </div>
      ))}
    </div>
  </div>
}
