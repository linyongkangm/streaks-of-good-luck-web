# 定时任务说明

## 概述

项目使用 `node-cron` 实现两个定时任务：

1. **数据采集任务** - 每天早上 8:00 执行
2. **摘要发送任务** - 每天早上 9:00 执行

## 定时任务详情

### 1. 数据采集任务（Data Collection Task）

**执行时间**: 每天早上 8:00  
**Cron 表达式**: `0 8 * * *`

**功能**:
- 从 `summary__tweet` 表查询所有唯一的 `collect_from` 值
- 启动 Chromium 浏览器并加载相关插件
- 触发 `EXTERNAL_EVENT` 自定义事件，传递 `collectFroms` 数组
- 等待数据采集完成（默认60秒）
- 关闭浏览器

**代码位置**: `lib/cron-tasks.ts` - `startDataCollectionTask()`

### 2. 摘要发送任务（Summary Send Task）

**执行时间**: 每天早上 9:00  
**Cron 表达式**: `0 9 * * *`

**功能**:
- 获取前一天的日期
- 从 `summary__tweet` 表查询前一日的所有摘要
- 按 `collect_from` 分组
- 对每个来源，选取最新的摘要
- 使用 `postArticleMessage` 发送到企业微信机器人
- 消息格式：
  - 标题：`{collect_from} - {日期}`
  - 内容：摘要内容
  - 链接：如果 collect_from 是 URL，则附带链接

**代码位置**: `lib/cron-tasks.ts` - `startSummarySendTask()`

## 启动方式

定时任务会在服务器启动时自动初始化，通过以下机制实现：

1. **自动启动**（推荐）：
   - 使用 Next.js 的 `instrumentation.ts` 钩子
   - 服务器启动时自动执行
   - 无需手动调用

2. **手动启动**：
   - 访问 API 端点：`GET /api/cron/init`
   - 适用于需要手动控制的场景

## 配置文件

### next.config.ts
```typescript
experimental: {
  instrumentationHook: true, // 启用 instrumentation 功能
}
```

### instrumentation.ts
服务器启动时的初始化钩子，自动启动定时任务。

## 调整定时任务

如需修改执行时间，编辑 `lib/cron-tasks.ts` 中的 cron 表达式：

```typescript
// 数据采集任务 - 当前: 每天 8:00
cron.schedule('0 8 * * *', async () => { ... });

// 摘要发送任务 - 当前: 每天 9:00
cron.schedule('0 9 * * *', async () => { ... });
```

### Cron 表达式格式
```
 ┌────────────── 分钟 (0 - 59)
 │ ┌──────────── 小时 (0 - 23)
 │ │ ┌────────── 日期 (1 - 31)
 │ │ │ ┌──────── 月份 (1 - 12)
 │ │ │ │ ┌────── 星期 (0 - 7, 0 和 7 都代表周日)
 │ │ │ │ │
 * * * * *
```

### 常用示例
- `0 8 * * *` - 每天 8:00
- `0 */2 * * *` - 每2小时执行一次
- `*/30 * * * *` - 每30分钟执行一次
- `0 9 * * 1` - 每周一 9:00
- `0 0 1 * *` - 每月1号 0:00

## 环境变量

确保配置以下环境变量：

```env
DATABASE_URL=your_database_url
WEIXIN_WEBHOOK=your_weixin_webhook_url
```

## 日志

定时任务执行时会输出日志：

```
Data collection task scheduled: every day at 8:00 AM
Summary send task scheduled: every day at 9:00 AM
All cron tasks started successfully
```

执行时的日志：
```
Starting data collection task...
Found 5 sources to collect from: [...]
EXTERNAL_EVENT triggered successfully
Data collection task completed
```

```
Starting summary send task...
Sent summary for https://x.com/elonmusk
Summary send task completed. Sent 3 summaries
```

## 故障排查

1. **定时任务未执行**
   - 检查服务器是否正常运行
   - 查看控制台是否有错误日志
   - 验证 `instrumentation.ts` 是否正确加载

2. **浏览器启动失败**
   - 确认 Playwright 已正确安装
   - 检查浏览器路径配置
   - 查看插件路径是否正确

3. **消息发送失败**
   - 验证 `WEIXIN_WEBHOOK` 环境变量
   - 检查网络连接
   - 查看企业微信机器人配置

## 手动测试

可以单独测试各个功能：

1. **测试数据采集**：
   ```bash
   curl http://localhost:3000/api/msg-push
   ```

2. **测试消息发送**：
   ```bash
   curl -X POST http://localhost:3000/api/msg-push \
     -H "Content-Type: application/json" \
     -d '{"msgtype":"text","detail":{"content":"测试消息"}}'
   ```

3. **初始化定时任务**：
   ```bash
   curl http://localhost:3000/api/cron/init
   ```
