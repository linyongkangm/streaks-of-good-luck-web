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

export async function fetchWebIntellCallAKShare(method: string, params: Record<string, any>) {
  return fetchWebIntell('call-akshare', {
    method,
    params,
  });
}
