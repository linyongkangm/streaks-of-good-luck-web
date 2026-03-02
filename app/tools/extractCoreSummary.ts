/**
 * 从文本中提取核心摘要（最多4字）
 * 流程：
 * 1. 分词并筛选语义词（名词、动词、形容词等）
 * 2. 通过词频、语义优先级提取核心字
 * 3. 若核心词不足，从原文本取靠前的字兜底
 * 4. 最终返回最多4个字
 */

/**
 * 词性优先级映射（POS - Part Of Speech）
 */
const POS_PRIORITY: Record<string, number> = {
  n: 10,   // 名词 - 最高优先级
  nr: 11,  // 人名
  ns: 11,  // 地名
  nt: 11,  // 机构名
  nz: 10,  // 其他专名
  v: 9,    // 动词
  vd: 9,   // 副动词
  vi: 9,   // 不及物动词
  vn: 9,   // 名动词
  a: 8,    // 形容词
  ad: 8,   // 副形词
  an: 8,   // 名形词
  d: 5,    // 副词
  m: 4,    // 数词
  q: 4,    // 量词
  t: 3,    // 时间词
  p: 0,    // 介词 - 过滤
  c: 0,    // 连词 - 过滤
  u: 0,    // 助词 - 过滤
  w: 0,    // 标点 - 过滤
  x: 0,    // 字符 - 过滤
}

interface WordInfo {
  word: string
  pos: string
  priority: number
  isChineseChar: boolean
  wordLength: number
  originalIndex: number
}

/**
 * 简单的词性检查（当jieba未提供词性时的后备方案）
 */
function estimatePOS(word: string): string {
  if (word.length === 0) return 'x'
  
  // 如果包含非中文字符，标记为字符
  if (!/^[\u4e00-\u9fff]+$/.test(word)) {
    return 'x'
  }
  
  // 简单启发式：长词可能是名词，短词可能是其他
  if (word.length >= 2) {
    return 'n' // 默认为名词
  }
  return 'a' // 单字倾向于形容词或其他
}

/**
 * 从文本中提取核心摘要（最多4字）
 * @param text 输入文本（milestone title）
 * @returns 最多4字的核心摘要
 */
export function extractCoreSummary(text: string): string {
  // 清理文本
  const cleanText = text.trim()
  if (!cleanText) return '无'

  const words: WordInfo[] = []
  
  // 分词逻辑：逐字分析（单字优先）
  let i = 0
  let originalIndex = 0
  
  while (i < cleanText.length) {
    // 尝试贪心匹配更长的词
    let matchedWord = ''
    let matchedPos = 'x'
    let matchedLen = 0
    
    // 从当前位置向后尝试匹配（最长匹配）
    for (let len = Math.min(4, cleanText.length - i); len >= 1; len--) {
      const candidate = cleanText.substring(i, i + len)
      
      // 如果全是中文字符才考虑
      if (/^[\u4e00-\u9fff]+$/.test(candidate)) {
        matchedWord = candidate
        matchedPos = len > 1 ? 'n' : estimatePOS(candidate)
        matchedLen = len
        break
      }
    }
    
    if (!matchedWord) {
      i++
      originalIndex++
      continue
    }
    
    // 计算词的优先级
    const basePriority = POS_PRIORITY[matchedPos] ?? 0
    // 长词优先级加成（名词倾向于多字），但控制在合理范围
    const lengthBonus = matchedWord.length > 1 ? matchedWord.length * 0.5 : 0
    const priority = basePriority + lengthBonus
    
    words.push({
      word: matchedWord,
      pos: matchedPos,
      priority,
      isChineseChar: /^[\u4e00-\u9fff]$/.test(matchedWord),
      wordLength: matchedWord.length,
      originalIndex,
    })
    
    i += matchedLen
    originalIndex += matchedLen
  }
  
  // 筛选有效词（优先级 > 0）
  const validWords = words.filter(w => POS_PRIORITY[w.pos] !== 0)
  
  if (validWords.length === 0) {
    // 如果没有有效词，从原文本取靠前的字
    return cleanText.substring(0, 4)
  }
  
  // 按优先级排序（降序），相同优先级保持原文本顺序
  validWords.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    return a.originalIndex - b.originalIndex
  })
  
  // 从排序后的词中提取字符，最多凑足4个字
  let result = ''
  let wordIndex = 0
  let charIndexInWord = 0
  
  while (result.length < 4 && wordIndex < validWords.length) {
    const word = validWords[wordIndex].word
    if (charIndexInWord < word.length) {
      result += word[charIndexInWord]
      charIndexInWord++
    } else {
      wordIndex++
      charIndexInWord = 0
    }
  }
  
  // 如果字符不足4个，从原文本取靠前的字补充
  if (result.length < 4) {
    let srcIndex = result.length
    while (result.length < 4 && srcIndex < cleanText.length) {
      if (/^[\u4e00-\u9fff]$/.test(cleanText[srcIndex])) {
        result += cleanText[srcIndex]
      }
      srcIndex++
    }
  }
  
  return result
}

/**
 * 批量提取摘要（用于API调用）
 */
export function extractCoreSummaryBatch(texts: string[]): string[] {
  return texts.map(extractCoreSummary)
}
