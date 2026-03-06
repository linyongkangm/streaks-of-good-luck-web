---
name: bigint-json-serialization
description: "Use when: working with Prisma BigInt fields, converting BigInt values to/from JSON, sending API responses with large numbers, or fixing JSON serialization errors with BigInt."
---

# BigInt JSON Serialization Handling

## Objective
Handle the JSON conversion of Prisma's `BigInt` type, which doesn't have native JSON support. This workflow ensures large integer fields (IDs, timestamps) serialize and deserialize correctly across API boundaries.

## Root Cause
JavaScript's JSON specification doesn't support `BigInt` natively. When a Prisma model has a `BigInt` field and you call `JSON.stringify()` or return it from an API route, the value converts to a string.

**Database schema example:**
```prisma
model info__stock_company {
  id BigInt @id @default(autoincrement())  // Issue: JSON converts this to string
  // ...
}
```

## Step-by-Step Workflow

### 1. Setup Global BigInt Serialization (Already Done)
The project is pre-configured in [`lib/db.ts`](../../lib/db.ts):
```typescript
BigInt.prototype.toJSON = function () {
  return this.toString();
};
```

**What this does:**
- Globally allows `JSON.stringify()` on BigInt values
- Converts BigInt to string representation in JSON output
- Applied automatically to all Prisma queries

**Verify it's in place:**
```bash
grep -n "toJSON" lib/db.ts
```

### 2. Recognize When BigInt Values Become Strings

#### In API Responses
When your API returns Prisma data, BigInt fields are automatically stringified:
```typescript
// In route.ts
const record = await prisma.info__stock_company.findUnique({
  where: { id: BigInt(123) },
});

// Prisma returns: { id: 123n (BigInt)... }
// JSON.stringify converts to: { id: "123" (string)... }
return NextResponse.json(record);  // id is now a string
```

#### Expected Output
```json
{
  "id": "123",
  "name": "Apple Inc."
}
```

### 3. Convert Strings Back to BigInt When Creating Related Records

**Context**: You receive a JSON payload with a BigInt ID as a string, and need to create a related record.

❌ **WRONG** — Passing string directly:
```typescript
const data = await req.json();  // { assoc_article_id: "456" }

await prisma.summary__article.create({
  data: {
    assoc_article_id: data.assoc_article_id,  // Type error: string, not BigInt
  },
});
```

✅ **CORRECT** — Explicit BigInt conversion:
```typescript
const data = await req.json();  // { assoc_article_id: "456" }

await prisma.summary__article.create({
  data: {
    assoc_article_id: data.assoc_article_id ? BigInt(data.assoc_article_id) : null,
  },
});
```

### 4. Type Safety in TypeScript

Use Prisma-generated types to prevent mistakes:
```typescript
import { info__stock_company } from '@prisma/client';

// TypeScript knows id is BigInt
const stock: info__stock_company = await prisma.info__stock_company.findUnique({
  where: { id: BigInt(123) },
});

// When returning from API, id becomes string in JSON
const jsonData: any = JSON.parse(JSON.stringify(stock));
console.log(typeof jsonData.id);  // "string"
```

### 5. Maintain Consistency in Filtering & Querying

Always wrap BigInt comparisons:
```typescript
// ❌ WRONG: Direct string comparison
const record = await prisma.info__stock_company.findUnique({
  where: { id: "123" },  // Type error
});

// ✅ CORRECT: Wrap in BigInt()
const record = await prisma.info__stock_company.findUnique({
  where: { id: BigInt("123") },
});

// ✅ Also correct: Direct number (auto-converts)
const record = await prisma.info__stock_company.findUnique({
  where: { id: BigInt(123) },
});
```

## Common Patterns

### Pattern A: Batch Create with Related IDs
```typescript
export async function POST(req: NextRequest) {
  const items = await req.json();  // Array of { name: string, parent_id: "123" }

  const created = await prisma.some_model.createMany({
    data: items.map((item) => ({
      name: item.name,
      parent_id: item.parent_id ? BigInt(item.parent_id) : null,
    })),
  });

  return NextResponse.json(created);  // parent_id becomes string in JSON response
}
```

### Pattern B: API Response Wrapper
```typescript
// Custom wrapper to document BigInt behavior
export interface ApiResponse<T> {
  data: T;  // Prisma records (with stringified BigInt fields)
  pagination?: {
    total: number;
    page: number;
  };
}

export async function GET(req: NextRequest) {
  const records = await prisma.info__predict.findMany();

  // All BigInt fields are automatically stringified by lib/db.ts setup
  return NextResponse.json<ApiResponse<typeof records>>({
    data: records,
    pagination: { total: records.length, page: 1 },
  });
}
```

### Pattern C: Bulk Update with BigInt IDs
```typescript
const payload = await req.json();  // { ids: ["1", "2", "3"], status: "done" }

const updated = await prisma.info__predict.updateMany({
  where: {
    id: {
      in: payload.ids.map(id => BigInt(id)),  // Convert strings to BigInt
    },
  },
  data: {
    verify_status: payload.status,
  },
});

return NextResponse.json(updated);
```

## Decision Tree

**Question**: How should I handle this BigInt field?

```
Is this a Prisma query input (where clause)?
  → YES: Wrap the string in BigInt()
  → NO: Proceed to next question

Is this a response being serialized to JSON?
  → YES: The global setup handles it automatically (becomes string)
  → NO: You're working with native JS, no conversion needed

Am I receiving BigInt as a string from a client/API?
  → YES: Wrap in BigInt() before creating/updating Prisma records
  → NO: Direct assignment is fine

Am I comparing BigInt values in JavaScript?
  → YES: Use BigInt() on both sides of comparison
  → NO: No action needed
```

## Quality Criteria

✅ All Prisma queries with BigInt IDs use `BigInt()` wrapper  
✅ API responses have BigInt fields as strings (expected behavior)  
✅ Client code handles BigInt fields as strings when parsing JSON responses  
✅ No TypeScript errors related to BigInt type mismatches  
✅ Batch operations convert string IDs to BigInt before Prisma calls  

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Type 'string' is not assignable to type 'BigInt'` | Forgot BigInt() wrapper in query | Wrap: `BigInt(stringValue)` |
| `Cannot convert undefined to BigInt` | Null/undefined value passed to BigInt() | Use conditional: `value ? BigInt(value) : null` |
| API response has `id: 123` (number) instead of `"123"` (string) | Setup in `lib/db.ts` not present or broken | Verify `BigInt.prototype.toJSON` defined in `lib/db.ts` |
| Frontend receives `id: null` but BigInt is not nullable | Schema mismatch | Add `?` to BigInt field in schema if it should be nullable |

## References
- Global setup: [`lib/db.ts`](../../lib/db.ts) (line 23)
- Prisma docs on BigInt: https://www.prisma.io/docs/orm/reference/prisma-schema-reference#unsupported
- Schema examples: [`prisma/schema.prisma`](../../prisma/schema.prisma)" search for `BigInt`
