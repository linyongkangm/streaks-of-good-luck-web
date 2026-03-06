---
name: cron-testing-dev-mode
description: "Use when: testing scheduled tasks in development, debugging cron job logic, or verifying data collection tasks without waiting for scheduled execution. Node-cron only runs in production."
---

# Cron Testing in Development Mode

## Objective
Test and debug cron job logic in development mode by calling API endpoints directly, since `node-cron` only initializes in production.

## Critical Insight
**⚠️ Cron tasks are initialized ONLY in production** (`NODE_ENV === 'production'`). In development, node-cron tasks do NOT run automatically. See [`instrumentation.ts`](../../instrumentation.ts) for the environment check.

**Workaround**: Call the underlying API endpoints directly via curl, Postman, or fetch during dev.

## Available Cron Tasks

| Task | Endpoint | Schedule (ET) | Purpose |
|------|----------|---------------|---------|
| Data Collection | `POST /api/cron/start-collection` | 8:00 AM | Launches Chromium, emits `EXTERNAL_EVENT` to trigger browser extension |
| Summary Send | `POST /api/cron/start-summary` | 9:00 AM | Groups yesterday's summaries, posts to WeChat |
| Stock Quote Sync | `POST /api/cron/stock-quote-sync` | Daily | Syncs stock price data from external sources |

**Implementation files:**
- [`lib/cron-tasks/startDataCollectionTask.ts`](../../lib/cron-tasks/startDataCollectionTask.ts)
- [`lib/cron-tasks/startSummarySendTask.ts`](../../lib/cron-tasks/startSummarySendTask.ts)
- [`lib/cron-tasks/startStockQuoteSyncTask.ts`](../../lib/cron-tasks/startStockQuoteSyncTask.ts)

## Step-by-Step Workflow

### 1. Start Local Dev Server
```bash
# Terminal 1: Next.js server (port 3000 in dev, 3001 in prod)
pnpm dev

# Terminal 2: Python API server (port 8001)
pnpm webIntell
```

### 2. Verify Dev Mode Environment
```bash
# Check that NODE_ENV is 'development'
echo $env:NODE_ENV  # PowerShell on Windows
# or
echo $NODE_ENV       # Bash/Linux
```

### 3. Test a Cron Task

#### Option A: Using curl
```bash
# Test Data Collection task
curl -X POST http://localhost:3000/api/cron/start-collection \
  -H "Content-Type: application/json"

# Test Summary Send task
curl -X POST http://localhost:3000/api/cron/start-summary \
  -H "Content-Type: application/json"
```

#### Option B: Using Postman
1. Create a new POST request
2. URL: `http://localhost:3000/api/cron/start-collection`
3. Body (raw JSON, if needed):
   ```json
   {}
   ```
4. Send

#### Option C: Using Browser Console
```javascript
fetch('http://localhost:3000/api/cron/start-collection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
})
  .then(r => r.json())
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Error:', err));
```

### 4. Monitor Execution

#### Check Next.js Terminal
Watch the Next.js server logs for:
- API request received
- Route handler execution
- Prisma queries
- External API calls (Python API, WeChat webhook)

Example log:
```
POST /api/cron/start-collection 200 in 342ms
Launched Chromium browser
Emitted EXTERNAL_EVENT
```

#### Check Python API Logs
Watch the Python API server logs (port 8001) for analysis results:
```
INFO: Running tweet analysis
POST /analyze-tweet 200
Returning 5 summaries
```

#### Inspect Database Changes
```bash
pnpm prisma studio
```
Browse the affected tables (e.g., `summary__tweet`) to see if records were created.

### 5. Debug Common Issues

#### Issue: "Failed to launch Chromium"
**Cause**: Playwright dependency not installed or Chromium binary missing.

**Fix:**
```bash
pnpm install  # Install all deps including Playwright binaries
```

#### Issue: WeChat Webhook Not Called
**Cause**: `WEIXIN_WEBHOOK` env var missing or disabled in dev.

**Fix:**
1. Check `.env.local` has `WEIXIN_WEBHOOK=https://qyapi.weixin.qq.com/...`
2. Modify `startSummarySendTask.ts` temporarily to log webhook calls:
   ```typescript
   console.log('Would post to webhook:', message);
   // Then proceed or comment out the actual POST
   ```

#### Issue: Python API Not Responding
**Cause**: FastAPI server not running or port mismatch.

**Fix:**
```bash
# Verify Python API is running
curl http://localhost:8001/health
# Should return 200 OK

# Check PYTHON_API_URL in .env.local
echo $env:PYTHON_API_URL  # Should be http://127.0.0.1:8001
```

## Decision Tree

**Question**: How should I test a cron task?

```
Am I in development mode?
  → YES: Can't wait for scheduled time, use endpoint directly
  → NO: (Production) Task runs automatically at scheduled time

Do I need to test the complete flow (from browser extension → API → Python → DB)?
  → YES: curl the `/api/cron/*` endpoint directly
  → NO: Test individual functions in isolation via Node REPL or test file

Do I need to test with real browser/Chromium?
  → YES: curl the data collection task; monitor Chromium process
  → NO: Mock Playwright in a test file instead

Do I need to verify database changes?
  → YES: Call endpoint, then run `pnpm prisma studio` to inspect tables
  → NO: Just check console logs in Next.js terminal
```

## Testing Checklist

✅ Dev server runs on port 3000  
✅ Python API runs on port 8001  
✅ Endpoint call completes without 500 errors  
✅ Appropriate logs appear in server terminal  
✅ Database changes visible in `pnpm prisma studio`  
✅ No orphaned Chromium processes after data collection  

## Advanced: Testing in Production Preview

To test cron behavior before deploy (simulates production):
```bash
# Set NODE_ENV temporarily
export NODE_ENV=production  # Bash/Linux
set NODE_ENV=production      # PowerShell on Windows

# Start server
pnpm start  # Runs build + start

# Cron tasks now auto-initialize
# Monitor logs, then stop (Ctrl+C)
```

**⚠️ Don't leave this running** — it may attempt real operations (collect tweets, send WeChat messages).

## References
- Cron task files: [`lib/cron-tasks/`](../../lib/cron-tasks/)
- Initialization hook: [`instrumentation.ts`](../../instrumentation.ts)
- API route example: [`app/api/cron/`](../../app/api/cron/)
- Environment check pattern: Search `NODE_ENV !== 'development'` in the codebase
