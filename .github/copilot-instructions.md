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

### Development Setup
```bash
pnpm install
pnpm dev              # Starts Next.js on port 3001
python supporting/webIntell/main.py server --port 8001  # Start Python API separately
```

### Database Operations (Prisma)
- `pnpm prisma generate` - Regenerate Prisma client after schema changes
- `pnpm prisma db push` - Sync schema changes to dev database
- `pnpm prisma studio` - Open visual database manager (crucial for debugging)
- Always run `generate` before tests/builds

### Key Data Flows

**Batch Tweet Processing** ([see batch-create-tweets/route.ts](app/api/batch-create-tweets/route.ts)):
1. POST tweets to `/api/batch-create-tweets`
2. Extract unique `collect_from` sources per date
3. Call Python `/analyze-tweet` endpoint (via `supporting/webIntell/main.py`) with tweet list
4. Save returned summaries to `summary__tweet` table
5. Post results to WeChat webhook (`WEIXIN_WEBHOOK` env var)

**Scheduled Tasks** ([lib/cron-tasks/](lib/cron-tasks/)):
- 8:00 AM: `startDataCollectionTask()` - Launches Chromium, triggers browser extension to collect data
- 9:00 AM: `startSummarySendTask()` - Queries `summary__tweet` from yesterday, groups by source, posts to WeChat
- Stock quotes sync: Fetches market data via `akshare` Python library

Tasks auto-start via Next.js instrumentation hook ([instrumentation.ts](instrumentation.ts)) in production.

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
- All dates default to `Asia/Shanghai` for stock market records
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

1. **Add a new API endpoint**: Create `app/api/[feature]/route.ts` → define GET/POST → use Prisma queries
2. **Modify analysis logic**: Edit Python code in `supporting/webIntell/tasks/` → test via `POST http://localhost:8001/[endpoint]`
3. **Query database**: Use `prisma.[model].findMany/findUnique()` → check [types/index.ts](types/index.ts) for response shape
4. **Send notifications**: Use `postMessage()` function from [tools/index.tsx](app/tools/index.tsx) to WeChat
5. **Debug data**: Run `pnpm prisma studio` to inspect any table in real-time
6. **Modify BigInt fields**: Remember: BigInt fields convert to strings in JSON (see [lib/db.ts](lib/db.ts) line 23)

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
