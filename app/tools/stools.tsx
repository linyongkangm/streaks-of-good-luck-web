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
