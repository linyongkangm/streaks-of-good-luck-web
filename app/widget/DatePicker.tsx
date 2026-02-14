/*
DatePicker 组件，
支持年份、月份、季度、日期模式，
年份模式：只选择年份，显示为 "2024"，值为 DateTime(2024-01-01)
月份模式：选择年份和月份，显示为 "2024-08"，值为 DateTime(2024-08-01)
季度模式：选择年份和季度，显示为 "2024-Q3"，值为 DateTime(2024-09-30)
日期模式：选择完整日期，显示为 "2024-08-15"，值为 DateTime(2024-08-15)
*/

'use client'

import { useState, useRef, useEffect } from 'react'
import { DateTime, MonthNumbers, QuarterNumbers } from 'luxon'

type DatePickerMode = 'year' | 'month' | 'quarter' | 'date'

interface DatePickerProps {
  mode?: DatePickerMode
  value?: DateTime
  onChange?: (value: DateTime) => void
  placeholder?: string
  className?: string
}

export default function DatePicker({
  mode = 'date',
  value,
  onChange,
  placeholder,
  className = '',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const now = DateTime.now()
  const [selectedYear, setSelectedYear] = useState(now.year)
  const [selectedMonth, setSelectedMonth] = useState<MonthNumbers>(now.month)
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterNumbers>(now.quarter)
  const [selectedDate, setSelectedDate] = useState(now)
  const containerRef = useRef<HTMLDivElement>(null)

  // 从value初始化选中的值
  useEffect(() => {
    if (value) {
      setSelectedYear(value.year)
      setSelectedMonth(value.month as MonthNumbers)
      setSelectedQuarter(value.quarter as QuarterNumbers)
      setSelectedDate(value)
    }
  }, [value])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 获取显示文本
  const getDisplayText = () => {
    if (!value) return placeholder || '请选择日期'

    switch (mode) {
      case 'year':
        return value.year.toString()
      case 'month':
        return value.toFormat('yyyy-MM')
      case 'quarter':
        return `${value.year}-Q${value.quarter}`
      case 'date':
        return value.toFormat('yyyy-MM-dd')
      default:
        return value.toFormat('yyyy-MM-dd')
    }
  }

  // 处理年份选择
  const handleYearSelect = (year: number) => {
    setSelectedYear(year)
    if (mode === 'year') {
      onChange?.(DateTime.fromObject({ year, month: 1, day: 1 }))
      setIsOpen(false)
    }
  }

  // 处理月份选择
  const handleMonthSelect = (month: MonthNumbers) => {
    setSelectedMonth(month)
    if (mode === 'month') {
      onChange?.(DateTime.fromObject({ year: selectedYear, month, day: 1 }))
      setIsOpen(false)
    }
  }

  // 处理季度选择
  const handleQuarterSelect = (quarter: QuarterNumbers) => {
    setSelectedQuarter(quarter)
    if (mode === 'quarter') {
      // 计算季度最后一天
      const lastMonth = quarter * 3
      const lastDay = DateTime.fromObject({ year: selectedYear, month: lastMonth }).endOf('month')
      onChange?.(lastDay)
      setIsOpen(false)
    }
  }

  // 处理日期选择
  const handleDateSelect = (dt: DateTime) => {
    setSelectedDate(dt)
    onChange?.(dt)
    setIsOpen(false)
  }

  // 获取某月的天数
  const getDaysInMonth = (year: number, month: MonthNumbers) => {
    return DateTime.fromObject({ year, month }).daysInMonth || 0
  }

  // 获取某月第一天是星期几
  const getFirstDayOfMonth = (year: number, month: MonthNumbers) => {
    return DateTime.fromObject({ year, month, day: 1 }).weekday % 7
  }

  // 渲染年份选择器
  const renderYearPicker = () => {
    const startYear = selectedYear - 5
    const years = Array.from({ length: 12 }, (_, i) => startYear + i)

    return (
      <div className="text-slate-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setSelectedYear(selectedYear - 12)}
            className="px-2 py-1 hover:bg-slate-100 rounded"
          >
            «
          </button>
          <span className="font-medium">{startYear} - {startYear + 11}</span>
          <button
            onClick={() => setSelectedYear(selectedYear + 12)}
            className="px-2 py-1 hover:bg-slate-100 rounded"
          >
            »
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => handleYearSelect(year)}
              className={`px-4 py-2 rounded hover:bg-slate-100 ${year === selectedYear ? 'bg-purple-500 text-white hover:bg-purple-600' : ''
                }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 渲染月份选择器
  const renderMonthPicker = () => {
    const months: MonthNumbers[] = Array.from({ length: 12 }, (_, i) => i + 1) as MonthNumbers[]

    return (
      <div className="text-slate-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="px-2 py-1 hover:bg-slate-100 rounded"
          >
            «
          </button>
          <span className="font-medium">{selectedYear}</span>
          <button
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="px-2 py-1 hover:bg-slate-100 rounded"
          >
            »
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {months.map((month) => (
            <button
              key={month}
              onClick={() => handleMonthSelect(month)}
              className={`px-4 py-2 rounded hover:bg-slate-100 ${month === selectedMonth && selectedYear === value?.year
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : ''
                }`}
            >
              {month}月
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 渲染季度选择器
  const renderQuarterPicker = () => {
    const quarters: QuarterNumbers[] = [1, 2, 3, 4]

    return (
      <div className="text-slate-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <span
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="px-2 py-1 hover:bg-slate-100 rounded cursor-pointer"
          >
            «
          </span>
          <span className="font-medium">{selectedYear}</span>
          <span
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="px-2 py-1 hover:bg-slate-100 rounded cursor-pointer"
          >
            »
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quarters.map((quarter) => (
            <button
              key={quarter}
              onClick={() => handleQuarterSelect(quarter)}
              className={`px-4 py-3 rounded hover:bg-slate-100 ${quarter === selectedQuarter && selectedYear === value?.year
                  ? 'bg-purple-500 text-white hover:bg-purple-600 hover:text-slate-700'
                  : ''
                }`}
            >
              Q{quarter}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 渲染日期选择器
  const renderDatePicker = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

    return (
      <div className="text-slate-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => {
              if (selectedMonth === 1) {
                setSelectedMonth(12)
                setSelectedYear(selectedYear - 1)
              } else {
                setSelectedMonth((selectedMonth - 1) as MonthNumbers)
              }
            }}
            className="px-2 py-1 hover:bg-slate-100 rounded"
          >
            «
          </button>
          <span className="font-medium">
            {selectedYear}年 {selectedMonth}月
          </span>
          <button
            onClick={() => {
              if (selectedMonth === 12) {
                setSelectedMonth(1)
                setSelectedYear(selectedYear + 1)
              } else {
                setSelectedMonth((selectedMonth + 1) as MonthNumbers)
              }
            }}
            className="px-2 py-1 hover:bg-slate-100 rounded"
          >
            »
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div key={day} className="text-center text-sm text-slate-500 py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const date = DateTime.fromObject({ year: selectedYear, month: selectedMonth, day })
            const isSelected =
              value &&
              date.year === value.year &&
              date.month === value.month &&
              date.day === value.day

            return (
              <button
                key={day}
                onClick={() => handleDateSelect(date)}
                className={`px-2 py-1 text-center rounded hover:bg-slate-100 ${isSelected ? 'bg-purple-500 text-white hover:bg-purple-600 hover:text-slate-700' : ''
                  }`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 根据模式渲染对应的选择器
  const renderPicker = () => {
    switch (mode) {
      case 'year':
        return renderYearPicker()
      case 'month':
        return renderMonthPicker()
      case 'quarter':
        return renderQuarterPicker()
      case 'date':
        return renderDatePicker()
      default:
        return null
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        readOnly
        value={getDisplayText()}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer text-slate-900 bg-white"
      />
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg min-w-[280px]">
          {renderPicker()}
        </div>
      )}
    </div>
  )
}
