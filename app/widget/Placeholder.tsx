'use client'

interface Props {
  selected: boolean;
  loading?: boolean;
  icon?: string;
  message?: string;
  children: React.ReactNode;
}

/* 选择占位 + 加载状态 */
export default function Placeholder({ selected, loading, icon = '📋', message = '请从左侧选择', children }: Props) {
  if (!selected) {
    return <div className="bg-white rounded-xl shadow-lg flex flex-col items-center justify-center py-32">
      <div className="text-6xl mb-4">{icon}</div>
      <p className="text-slate-400 text-lg">{message}</p>
    </div>
  }
  if (loading) {
    return <div className="bg-white rounded-xl shadow-lg flex items-center justify-center py-32">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
    </div>
  }
  return children
}
