---
name: timezone-handling
description: "Use when: converting between UTC and Eastern Time, querying stock market dates, fixing off-by-one timezone bugs, or comparing market dates with database timestamps. Essential for cron tasks that reference 'yesterday' in ET."
---

# Timezone Handling in Streaks of Good Luck

## Objective
Handle conversions between UTC (database storage) and Eastern Time (ET, stock market convention) without off-by-one errors. This is critical for cron tasks, data queries, and market date calculations.

## Root Cause
- **Database stores all timestamps as UTC**
- **Stock market dates operate in America/New_York (Eastern Time)**
- **Direct UTC ↔ ET comparisons cause bugs** when mixing timezones without explicit conversion

## Step-by-Step Workflow

### 1. Identify the Date Context
**Decision**: Is this date a **stock market date** (ET) or a **UTC timestamp**?
- Stock market reference → Use **Eastern Time**
- Database query → Expect **UTC**, convert to ET if displaying or logic requires ET
- Cron task reference to "today" or "yesterday" → Use **Eastern Time**

### 2. Choose the Right Helper Function
Available functions in [`app/tools/index.tsx`](../../app/tools/index.tsx):
```typescript
fromISOUseEastern("2025-03-05")    // Parse ISO string as ET midnight
toEastern(new Date())               // Convert UTC Date to ET
fromISOUseUTC("2025-03-05")        // Parse ISO string as UTC midnight
```

Alternative using Luxon (imported in same file):
```typescript
DateTime.now().setZone('America/New_York')  // Set timezone to ET
```

### 3. Apply the Correct Pattern

#### Pattern A: Query Yesterday's Data (Cron Task)
**Context**: Running at 9 AM ET, need "yesterday's" summaries in the market calendar.

❌ **WRONG** — Creates UTC midnight:
```typescript
const yesterday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1));
```

✅ **CORRECT** — Parse as ET midnight, subtract 1 day in ET:
```typescript
import { fromISOUseEastern } from '@/app/tools';

const nowET = new Date();
const todayET = fromISOUseEastern(nowET.toISOString().split('T')[0]);
const yesterdayET = new Date(todayET.getTime() - 24 * 60 * 60 * 1000);

// Query database:
const summaries = await prisma.summary__tweet.findMany({
  where: {
    create_date: {
      gte: yesterdayET,
      lt: todayET,
    },
  },
});
```

#### Pattern B: Compare Stock Date with Database Timestamp
**Context**: Stock data dated "2025-03-05" (ET market date) stored in DB as UTC timestamp.

```typescript
const marketDate = "2025-03-05"; // ET market date
const marketDateET = fromISOUseEastern(marketDate); // ET midnight

// Database stores UTC, so convert ET midnight to UTC for query
const startUTC = marketDateET;
const endUTC = new Date(marketDateET.getTime() + 24 * 60 * 60 * 1000);

const quotes = await prisma.quote__stock_constituent_daily.findMany({
  where: {
    date_quote: {
      gte: startUTC,
      lt: endUTC,
    },
  },
});
```

#### Pattern C: Display Market Date to User
**Context**: Database stores UTC; display to user as ET date.

```typescript
const utcTimestamp = new Date(dbRecord.timestamp);
const etDisplay = toEastern(utcTimestamp); // Returns Date in ET
const etDateString = etDisplay.toISOString().split('T')[0]; // "2025-03-05"
```

### 4. Verify the Conversion

**Checklist before committing:**
- [ ] Cron task "yesterday" reference checks if **ET calendar** rolled over, not UTC
- [ ] Stock market date queries compare **ET midnight to ET midnight** boundaries
- [ ] Database queries use **UTC values** (from conversion functions)
- [ ] UI display explicitly calls `toEastern()` on timestamps
- [ ] No direct `Date.UTC()` construction for market dates

## Common Pitfalls & Fixes

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Comparing UTC directly to ET calendar | Off-by-one errors on DST transitions or day boundaries | Always parse market dates with `fromISOUseEastern()`, then convert to UTC for DB queries |
| Using `new Date("2025-03-05")` without timezone | Browser assumes local timezone (varies per machine) | Use `fromISOUseEastern()` or explicit timezone helper; never rely on browser defaults |
| Forgetting ET is UTC-5 or UTC-4 (DST) | Query returns no results on DST boundaries | Use luxon or provided helpers; they handle DST automatically |
| Storing ET datetime directly in DB | Queries break when deployed to different timezone servers | Always store UTC in database; convert in application layer |

## Quality Criteria
✅ Cron tasks correctly query "previous calendar day" in ET, even across midnight US/Eastern  
✅ Stock price queries span exactly the ET market hours (midnight ET to midnight ET)  
✅ Database stores only UTC; no ET timestamps in schema  
✅ UI displays dates in ET context without confusion  
✅ Tests pass on DST transition dates (second Sunday in March, first Sunday in November)

## References
- Helper functions: [`app/tools/index.tsx`](../../app/tools/index.tsx)
- Luxon docs: https://moment.github.io/luxon/docs/
- Cron task example: [`lib/cron-tasks/startSummarySendTask.ts`](../../lib/cron-tasks/startSummarySendTask.ts)
