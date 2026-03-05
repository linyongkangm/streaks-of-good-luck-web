# Streaks of Good Luck - AI Agent Instructions

## Architecture Overview

This is a **financial analysis system** with a distributed architecture:
- **Next.js** (port 3001): Web app & REST APIs with Prisma ORM for database operations
- **Python FastAPI** (port 8001): AI analysis engine using `supporting/webIntell/main.py`
- **MariaDB**: Centralized data store with 20+ Prisma models (stocks, tweets, predictions, articles)
- **Node-Cron**: Automated daily tasks (data collection, summary distribution)

### Critical Insight
The architecture **separates concerns strictly**: Next.js handles data I/O & coordination, Python handles pure AI analysis. Routes must call the Python API (`PYTHON_API_URL` env var) for analysis—never embed analysis logic in TypeScript.

## Data Models & Naming Convention

All Prisma models follow a **prefix convention** (see [schema.prisma](schema.prisma)):
- `info__*`: Static master data (stock companies, boards, industries, tweets, articles)
- `quote__*`: Market timeseries data (stock prices, financial statements)
- `summary__*`: Analysis outputs (tweet summaries, article summaries)
- `indicator__*`: Prediction/observation records
- `relation__*`: Junction tables for many-to-many relationships
- `view_*`: Database views

**Key tables** you'll modify most:
- `info__predict`: Market predictions from AI analysis (has `verify_status`: not_due, partial, implemented, etc.)
- `summary__tweet`: Grouped tweet analysis by source & date
- `summary__article`: Article analysis summaries
- `info__tweet`: Raw tweet data
- `quote__stock_constituent_daily`: Daily stock price data

## Critical Developer Workflows

### Development Setup (Dev Mode)
```bash
pnpm install
pnpm dev              # Starts Next.js ONLY on port 3000 (not 3001 in dev)
# In separate terminal:
pnpm webIntell        # Starts Python API on port 8001
```

### Production Setup
```bash
pnpm build
pnpm start            # Runs Next.js (port 3001) + Python API (port 8001) concurrently
```

### Database Operations (Prisma)
- `pnpm prisma generate` - **CRITICAL after schema.prisma edits** - regenerates Prisma client & types
- `pnpm prisma db push` - Sync schema changes to dev database
- `pnpm prisma migrate dev` - Create migration (recommended for production)
- `pnpm prisma studio` - Open visual database manager (crucial for debugging)
- **⚠️ Never skip**: Run `generate` before tests/builds after schema changes, or TypeScript will fail with missing types

### Key Data Flows

**Batch Tweet Processing** ([see batch-create-tweets/route.ts](app/api/batch-create-tweets/route.ts)):
1. POST tweets to `/api/batch-create-tweets`
2. Extract unique `collect_from` sources per date
3. Call Python `/analyze-tweet` endpoint (via `supporting/webIntell/main.py`) with tweet list
4. Save returned summaries to `summary__tweet` table
5. Post results to WeChat webhook (`WEIXIN_WEBHOOK` env var)

**Browser Extension Data Collection**:
1. `startDataCollectionTask()` launches Chromium browser via Playwright
2. Emits custom DOM event: `EXTERNAL_EVENT` (listened to by x-spider-extension)
3. Extension collects tweets/articles via HTTP requests (network monitoring)
4. Sends batch data to:
   - `/api/batch-create-tweets` for tweets
   - `/api/update-articles` for WSJ/Economist articles
5. Browser auto-closes after 15 minutes idle to avoid resource leaks
6. Next cron run (next day) relaunches collection

**Scheduled Tasks** ([lib/cron-tasks/](lib/cron-tasks/)):
- **8:00 AM ET** (via `startDataCollectionTask`): Launches Chromium, emits `EXTERNAL_EVENT` event to trigger browser extension data collection (tweets, WSJ articles). Browser auto-closes after 15min idle.
- **9:00 AM ET** (via `startSummarySendTask`): Queries yesterday's summaries, groups by source, posts grouped results to WeChat webhook
- **1st & 16th @ 9:02 AM ET**: Half-month collection for Economist articles

**Important**: Cron tasks are **initialized only in production** (`NODE_ENV !== 'development'`). In dev mode, you must test by calling endpoints directly (e.g., via curl or API client). See [startDataCollectionTask.ts](lib/cron-tasks/startDataCollectionTask.ts) for how the `EXTERNAL_EVENT` triggers the browser extension.

Tasks auto-start via Next.js instrumentation hook ([instrumentation.ts](instrumentation.ts)) when deployed.

## ⚠️ Critical Gotchas & Common Errors

### Timezone Handling (EXTREMELY IMPORTANT)
- **Database stores all timestamps as UTC**
- **Stock market dates use America/New_York (Eastern Time)**
- **Common bug**: Comparing UTC times directly with ET calendar dates causes off-by-one errors
- **Helper functions** in [app/tools/index.tsx](app/tools/index.tsx):
  ```typescript
  fromISOUseEastern("2025-03-05")    // Parse as ET midnight
  toEastern(new Date())              // Convert UTC to ET
  fromISOUseUTC("2025-03-05")        // Parse as UTC midnight
  DateTime.now().setZone('America/New_York')  // Use luxon for conversions
  ```
- **Real-world pattern**: Cron queries "yesterday" in ET, but DB stores UTC → must convert carefully
  ```typescript
  // ❌ WRONG: Creates UTC midnight, not ET midnight
  const yesterday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  
  // ✅ CORRECT: Parse as ET midnight
  const startET = fromISOUseEastern(date).startOf('day');
  ```

### BigInt JSON Serialization
- **Issue**: Prisma `BigInt` fields → JSON convert to `string` (no native JSON BigInt support)
- **Solution**: Defined in [lib/db.ts](lib/db.ts): `BigInt.prototype.toJSON = function () { return this.toString() }`
- **When creating related records**: Must convert string back to BigInt:
  ```typescript
  assoc_article_id: data.assoc_article_id ? BigInt(data.assoc_article_id) : null
  ```

### Cron Jobs Only Run in Production
- **Dev mode**: `node-cron` is skipped entirely (check `instrumentation.ts`)
- **In development**, test cron job logic by:
  - Calling API endpoints directly with curl/Postman
  - Temporarily modifying `instrumentation.ts` to register tasks in dev (not recommended)
  - Manually invoking the task functions in the terminal
- **Implication**: You can't test cron job timing locally without special setup

### PYTHON_API_URL Inconsistency
- **Documented default**: Port 8001
- **Gotcha**: Some files hardcode `8000` as fallback (e.g., `analyzeTweetsForDateAndSource.ts` uses `PYTHON_API_URL || 'http://127.0.0.1:8000'`)
- **Action required**: Always set `PYTHON_API_URL=http://127.0.0.1:8001` in `.env.local`, and audit code for hardcoded 8000 references

### Prisma Generate Must Run After Schema Changes
- **Forgetting this** → TypeScript build fails with missing type definitions
- **When to run**: Immediately after editing `schema.prisma`
- **Command**: `pnpm prisma generate`
- **Impact**: Blocks all builds and tests if missed

### Browser Data Collection Context (Chromium Auto-Cleanup)
- `startDataCollectionTask()` launches Chromium via Playwright
- Browser **auto-closes after 15 minutes of idle time**
- Network failures can leave orphaned Chromium processes
- Next cron run will relaunch (expensive operation)
- **Monitor**: Check for stray chromium processes on production servers

## Essential Patterns & Conventions

### API Route Pattern (Next.js)
```typescript
// Routes use path parameters for IDs: GET /api/predicts/[id]/route.ts
// Query params for filtering: GET /api/predicts?month=2025-03
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const data = await prisma.info__predict.findMany({ /* ... */ });
  return NextResponse.json(data);
}
```

### Python API Pattern (FastAPI)
- All methods in [supporting/webIntell/main.py](supporting/webIntell/main.py)
- Request models use Pydantic: `class TweetAnalysisRequest(BaseModel)`
- Responses: `{"data": {...}, "pagination": {...}}` structure (see [types/index.ts](types/index.ts))
- HTTP integration: Next.js uses `fetch()` to call Python endpoints

### Timezone Handling
- **Critical**: See "Critical Gotchas & Common Errors" section above for patterns and common bugs
- All dates default to `Asia/Shanghai` for UI display
- Use `luxon` library (imported in [tools/index.tsx](app/tools/index.tsx)) for conversions
- Store dates in database as UTC, convert in application layer

### Type Safety
- Export all API response types from [types/index.ts](types/index.ts)
- Use `ApiResponse<T>` wrapper for JSON responses
- Prisma types auto-generate; import directly: `import { info__predict } from '@prisma/client'`

### UI & Components
- Use Tailwind CSS (configured in [postcss.config.mjs](postcss.config.mjs))
- Reusable widgets in [app/widget/](app/widget/) (Table, Modal, Form, DatePicker, etc.)
- Components organize by feature under [app/components/](app/components/) (e.g., `StockAnalysis/`, `Predicts/`)

## Environment & Integration Points

**Required .env.local Variables**:
```
DATABASE_URL=mysql://user:pass@host:3306/streaks_of_good_luck
PYTHON_API_URL=http://127.0.0.1:8001
WEIXIN_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
```

**External Services**:
- **WeChat Work Webhook**: Posts message summaries to corporate chat (use `postMessage()` from [tools/index.tsx](app/tools/index.tsx))
- **AkShare**: Python library for Chinese stock data (see [supporting/webIntell/tasks/](supporting/webIntell/tasks/))
- **Playwright**: Browser automation for data collection (configured in package.json)

## Common Tasks for AI Agents

1. **Add a new API endpoint**: Create `app/api/[feature]/route.ts` → define GET/POST → use Prisma queries → return `NextResponse.json()`
2. **Modify analysis logic**: Edit Python code in `supporting/webIntell/tasks/` → test via `POST http://localhost:8001/docs` (Swagger UI)
3. **Query database**: Use `prisma.[model].findMany/findUnique()` → check [types/index.ts](types/index.ts) for response shape
4. **Send notifications**: Use `postMessage()` function from [tools/index.tsx](app/tools/index.tsx) to WeChat
5. **Debug data**: Run `pnpm prisma studio` to inspect any table in real-time
6. **Modify BigInt fields**: Remember: BigInt fields convert to strings in JSON (see [lib/db.ts](lib/db.ts) line 23)
7. **Test in dev mode**: For non-cron work, run `pnpm dev` + `pnpm webIntell` in separate terminals
8. **After schema changes**: ALWAYS run `pnpm prisma generate` before builds or tests

## Debugging & Validation

- **API docs**: Python API docs available at `http://localhost:8001/docs` (Swagger UI)
- **Log queries**: Prisma logging enabled in dev mode ([lib/db.ts](lib/db.ts))
- **Health check**: `GET http://localhost:8001/health`
- **Test routes**: Use curl or Postman against `http://localhost:3001/api/*`
- **Database issues**: Common fix = run `pnpm prisma generate` after schema changes

## Reference Files (Important for Context)

- **Schema**: [prisma/schema.prisma](prisma/schema.prisma) - All data structures
- **Cron Jobs**: [lib/cron-tasks/](lib/cron-tasks/) - Scheduling & automation
- **Python API**: [supporting/webIntell/main.py](supporting/webIntell/main.py) - Analysis endpoints
- **Types**: [types/index.ts](types/index.ts) - All API response types
- **Tools/Utils**: [app/tools/index.tsx](app/tools/index.tsx) - Timezone, messaging, environment checks
- **Database**: [lib/db.ts](lib/db.ts) - Prisma client singleton
