'use client'
import type {
  info__stock_company,
} from '@/types'

interface Props {
  selectedCompany: info__stock_company | null;
  children: React.ReactNode;
}

/* 个股选择占位 */
export default function IndustryAnalysisLoading({ selectedCompany, children }: Props) {
  if (!selectedCompany) {
    return <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-xl shadow-lg">
      <div className="text-6xl mb-4">📋</div>
      <p className="text-slate-500 text-lg">请从左侧选择一只股票</p>
    </div>
  }
  return children
}