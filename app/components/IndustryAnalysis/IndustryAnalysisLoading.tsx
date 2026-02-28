'use client'

interface Props {
  selectedIndustryId: number | null;
  loadingDetail: boolean;
  children: React.ReactNode;
}

/* 行业选择占位 */
export default function IndustryAnalysisLoading({ selectedIndustryId, loadingDetail, children }: Props) {
  if (!selectedIndustryId) {
    return <div className="bg-white rounded-xl shadow-lg flex flex-col items-center justify-center py-32">
      <div className="text-6xl mb-4">👈</div>
      <p className="text-slate-400 text-lg">请从左侧选择一个行业</p>
    </div>
  }
  if (loadingDetail) {
    return <div className="bg-white rounded-xl shadow-lg flex items-center justify-center py-32">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
    </div>
  }
  return children
}
