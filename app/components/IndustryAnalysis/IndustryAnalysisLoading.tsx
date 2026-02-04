'use client'
import Loading from '@/app/widget/Loading';
import type {
  StockBoardWithRelations,
} from '@/types'

interface Props {
  loading: boolean;
  selectedBoard: StockBoardWithRelations | null;
  children: React.ReactNode;
}

/* 板块标题编辑 */
export default function IndustryAnalysisLoading({ loading, selectedBoard, children }: Props) {
  if (loading) {
    return <Loading></Loading>
  }
  if (!selectedBoard) {
    return <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-xl shadow-lg">
      <div className="text-6xl mb-4">📋</div>
      <p className="text-slate-500 text-lg">请从左侧选择一个行业板块</p>
    </div>
  }
  return children
}