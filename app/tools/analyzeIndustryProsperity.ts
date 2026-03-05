const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || process.env.PYTHON_API_URL || 'http://127.0.0.1:8001'

/**
 * 调用Python API分析行业景气度
 * @param content 文件内容或文本
 * @param industryName 行业名称
 * @returns 分析结果
 */
export async function analyzeIndustryProsperity(
  content: string,
  industryName?: string
) {
  try {
    const response = await fetch(`${PYTHON_API_URL}/analyze-industry-prosperity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: content,
        industry_name: industryName,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API returned ${response.status}: ${error}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to analyze industry prosperity:', error)
    throw error
  }
}
