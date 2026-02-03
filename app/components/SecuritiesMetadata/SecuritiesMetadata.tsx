'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'
import SecuritiesMetadataCompanies from './SecuritiesMetadataCompanies'
import SecuritiesMetadataQuotes from './SecuritiesMetadataQuotes'
export default function SecuritiesMetadata() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <SecuritiesMetadataCompanies></SecuritiesMetadataCompanies>
        <SecuritiesMetadataQuotes></SecuritiesMetadataQuotes>
      </div>
    </div>
  )
}