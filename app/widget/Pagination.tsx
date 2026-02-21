'use client'

import Button from '@/app/widget/Button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export default function Pagination({ page, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={`flex items-center justify-center gap-2 mt-6 ${className}`}>
      <Button
        onClick={() => onPageChange(Math.max(1, page - 1))}
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
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        look="cancel"
        size="small"
      >
        下一页 →
      </Button>
    </div>
  )
}