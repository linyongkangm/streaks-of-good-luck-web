const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8001'

export async function extractMilestoneImpact(
  title: string,
  description?: string | null,
  context?: string | null
): Promise<string> {
  try {
    const response = await fetch(`${PYTHON_API_URL}/extract-milestone-impact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description: description || '',
        context: context || '',
      }),
      signal: AbortSignal.timeout(1000 * 20),
    })

    if (!response.ok) {
      const raw = await response.text()
      console.error('extract-milestone-impact failed:', response.status, raw)
      return '中性'
    }

    const result = await response.json()
    const impact = result?.impact || '中性'

    // Validate impact is one of the allowed values
    const validImpacts = ['超正面', '正面', '中性', '负面', '超负面']
    return validImpacts.includes(impact) ? impact : '中性'
  } catch (error) {
    console.error('extractMilestoneImpact error:', error)
    return '中性'
  }
}
