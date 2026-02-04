'use client'

export interface Column<T> {
  title: string
  dataIndex: keyof T | string
  key?: string
  align?: 'left' | 'right' | 'center'
  width?: string
  sticky?: boolean
  render?: (value: any, record: T, index: number) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  dataSource: T[]
  loading?: boolean
  emptyText?: string
  rowClassName?: (record: T, index: number) => string
  onRow?: (record: T, index: number) => {
    onClick?: (e: React.MouseEvent) => void
    [key: string]: any
  }
}

export default function Table<T>({ 
  columns, 
  dataSource, 
  loading = false, 
  emptyText = '暂无数据',
  rowClassName,
  onRow 
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
      </div>
    )
  }

  if (dataSource.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">{emptyText}</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b-2 border-slate-200">
            {columns.map((column) => (
              <th
                key={String(column.dataIndex) || column.key}
                className={`px-4 py-3 text-${column.align || 'left'} text-sm font-semibold text-slate-700 ${
                  column.sticky ? 'sticky left-0 bg-slate-50 z-10' : ''
                } ${column.className || ''}`}
                style={{ width: column.width }}
                data-column-key={String(column.dataIndex) || column.key}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((record, index) => {
            const rowProps = onRow?.(record, index) || {}
            const rowClass = rowClassName?.(record, index) || ''
            
            return (
              <tr
                key={index}
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${rowClass}`}
                {...rowProps}
                data-row-key={index}
              >
                {columns.map((column) => {
                  const value = record[column.dataIndex as keyof T];
                  return (
                    <td
                      key={String(column.dataIndex) || column.key}
                      data-column-key={String(column.dataIndex) || column.key}
                      className={`px-4 py-3 text-sm text-slate-900 text-${column.align || 'left'} ${
                        column.sticky ? 'sticky left-0 bg-white hover:bg-slate-50' : ''
                      } ${column.className || ''}`}
                    >
                      {column.render ? column.render(value, record, index) : String(value ?? '')}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
