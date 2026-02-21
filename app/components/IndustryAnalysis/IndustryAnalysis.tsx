'use client'

import { useState, useEffect } from 'react'
import type {
  info__stock_board,
  StockBoardWithRelations,
} from '@/types'
import IndustryAnalysisStockBoardInfo from './IndustryAnalysisStockBoardInfo'
import IndustryAnalysisRelatedCompanies from './IndustryAnalysisRelatedCompanies'
import IndustryAnalysisStockBoards from './IndustryAnalysisStockBoards'
import IndustryAnalysisIndustryAnalysis from './IndustryAnalysisIndustryAnalysis'
import IndustryAnalysisLoading from './IndustryAnalysisLoading'
import Loading from '@/app/widget/Loading'
import IndustryAnalysisVisual from './IndustryAnalysisVisual'
import IndustryAnalysisPredictions from './IndustryAnalysisPredictions'

export default function IndustryAnalysis() {
  const [boards, setBoards] = useState<info__stock_board[]>([])
  const [selectedBoard, setSelectedBoard] = useState<StockBoardWithRelations | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/stock-boards')
      const data = await response.json()
      setBoards(data.data || [])
    } catch (error) {
      console.error('Failed to fetch boards:', error)
    } finally {
      setLoading(false)
    }
  }


  const fetchBoardDetail = async (boardId: number) => {
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/stock-boards/${boardId}`)
      const data = await response.json()
      if (data.data.relation__stock_board_company.length === 1) {
        setSelectedCompanyId(data.data.relation__stock_board_company[0].company_id)
      } else {
        setSelectedCompanyId(null) // 切换板块时重置选中的公司
      }
      setSelectedBoard(data.data)
    } catch (error) {
      console.error('Failed to fetch board detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading) {
    return <Loading></Loading>
  }

  return (
    <div className="grid grid-cols-12 gap-6 p-6 max-w-[1800px] mx-auto">
      {/* 左侧：行业板块列表 */}
      <div className="col-span-3">
        <IndustryAnalysisStockBoards
          boards={boards}
          selectedBoard={selectedBoard}
          setSelectedBoard={(board) => {
            setSelectedBoard(board)
            setSelectedCompanyId(null)
          }}
          fetchBoards={fetchBoards}
          fetchBoardDetail={fetchBoardDetail}
        ></IndustryAnalysisStockBoards>
      </div>

      {/* 右侧：详细信息 */}
      <div className="col-span-9">
        <IndustryAnalysisLoading loading={detailLoading} selectedBoard={selectedBoard}>
          {
            !selectedBoard ? null : <div className="space-y-6">
              {/* 板块标题编辑 */}
              <IndustryAnalysisStockBoardInfo selectedBoard={selectedBoard} fetchBoards={fetchBoards} fetchBoardDetail={fetchBoardDetail}></IndustryAnalysisStockBoardInfo>
              <IndustryAnalysisVisual selectedBoard={selectedBoard} selectedCompanyId={selectedCompanyId}></IndustryAnalysisVisual>
              {/* 关联公司 */}
              <IndustryAnalysisRelatedCompanies selectedBoard={selectedBoard} fetchBoards={fetchBoards} fetchBoardDetail={fetchBoardDetail} selectedCompanyId={selectedCompanyId} setSelectedCompanyId={setSelectedCompanyId}></IndustryAnalysisRelatedCompanies>
              {/* 预测数据 */}
              <IndustryAnalysisPredictions selectedBoard={selectedBoard} selectedCompanyId={selectedCompanyId}></IndustryAnalysisPredictions>
              {/* 行业分析报告 */}
              <IndustryAnalysisIndustryAnalysis selectedBoard={selectedBoard}></IndustryAnalysisIndustryAnalysis>
            </div>
          }
        </IndustryAnalysisLoading>
      </div>
    </div>
  )
}
