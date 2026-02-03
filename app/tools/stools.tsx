import { chromium } from 'playwright';


export async function launchBrowser(hostUrl: string = 'http://localhost:3000/') {
  try {
    const extensionPaths = [
      'D:\\code\\streaks-of-good-luck-web\\supporting\\x-spider-extension',
      'D:\\code\\bypass-paywalls-chrome-clean-master'
    ];
    // 创建临时用户数据目录
    const userDataDir = 'D:\\code\\playwright-chrome-profile';
    console.log('User data dir:', userDataDir);
    // 使用launchPersistentContext加载插件（只有Chromium支持扩展）
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chromium',
      args: [
        '--disable-blink-features=AutomationControlled',
        `--disable-extensions-except=${extensionPaths.join(',')}`,
        `--load-extension=${extensionPaths.join(',')}`,
      ],
    });

    const page = context.pages()[0] || await context.newPage();
    // 隐藏webdriver特征
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // 访问指定URL
    const url = hostUrl;
    await page.goto(url, { waitUntil: 'networkidle' });
    return context;
  } catch (error) {
    console.error('Error launching browser with extensions:', error);
  }
}

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000'
export async function fetchWebIntell(api: string, params: Record<string, any>) {
  const url = `${PYTHON_API_URL}/${api}`;
  console.log(`Calling Python API: ${url}`)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  console.log(`Received response from Python API: ${url} - Status: ${response.status}`)
  return response;
}

/**
调用 WebIntell 的 Call AKShare 接口
method: AKShare 方法名
params: AKShare 方法参数
示例：
-- 返回公司信息
method=stock_individual_info_em params={"symbol":"600519"}
return=[{'item': '最新', 'value': 10.83}, {'item': '股票代码', 'value': '000001'}, {'item': '股票简称', 'value': '平安银行'}, {'item': '总股本', 'value': 19405918198.0}, {'item': '流通股', 'value': 19405600653.0}, {'item': '总市值', 'value': 210166094084.34}, {'item': '流通市值', 'value': 210162655071.99}, {'item': '行业', 'value': '银行'}, {'item': '上市时间', 'value': 19910403}]

-- 返回历史行情
method=stock_zh_a_hist params={"symbol":"600519","period":"daily","start_date":"20220101","end_date":"20221231","adjust":"qfq"|"hfq"|null}
return=[{'日期': '2022-01-03', '开盘': 1796.0, '收盘': 1783.0, '最高': 1798.0, '最低': 1770.0, '成交量': 123456, '成交额': 12345, '振幅': 1.5, '涨跌幅': 2, '涨跌额': 13, '换手率': 1.2}, {...}, ...]
 */
export async function fetchWebIntellCallAKShare(method: string, params: Record<string, any>) {
  return fetchWebIntell('call-akshare', {
    method,
    params,
  });
}
