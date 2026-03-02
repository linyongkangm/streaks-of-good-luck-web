const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8001'

function sanitizeKeyword(keyword: string, fallbackText: string): string {
  const normalized = (keyword || '').replace(/[^\u4e00-\u9fff]/g, '')
  if (normalized.length >= 2) {
    return normalized.slice(0, 8)
  }

  const fallback = (fallbackText || '').replace(/[^\u4e00-\u9fff]/g, '')
  if (fallback.length >= 2) {
    return fallback.slice(0, 8)
  }

  if (fallback.length === 1) {
    return `${fallback}事件`
  }

  return '行业事件'
}

export async function extractMilestoneKeyword(title: string, description?: string | null): Promise<string> {
  const fallbackText = `${title || ''}${description || ''}`

  try {
    const response = await fetch(`${PYTHON_API_URL}/extract-milestone-keyword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description: description || '',
      }),
      signal: AbortSignal.timeout(1000 * 20),
    })

    if (!response.ok) {
      const raw = await response.text()
      console.error('extract-milestone-keyword failed:', response.status, raw)
      return sanitizeKeyword('', fallbackText)
    }

    const result = await response.json()
    return sanitizeKeyword(result?.keyword || '', fallbackText)
  } catch (error) {
    console.error('extractMilestoneKeyword error:', error)
    return sanitizeKeyword('', fallbackText)
  }
}
