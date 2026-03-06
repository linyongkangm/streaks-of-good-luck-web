---
name: prisma-schema-changes
description: "Use when: modifying schema.prisma, adding new Prisma models or fields, updating database structure, or getting TypeScript type errors after schema edits. Critical: always regenerate after schema changes."
---

# Prisma Schema Changes Workflow

## Objective
Safely apply schema changes to `schema.prisma` and synchronize the database and generated types. This workflow prevents cascading TypeScript errors and database sync issues.

## Critical Insight
**⚠️ Never skip `pnpm prisma generate` after schema.prisma edits.** Failing to regenerate causes TypeScript build failures with missing type definitions across the entire codebase.

## Step-by-Step Workflow

### 1. Edit schema.prisma
Modify [`prisma/schema.prisma`](../../prisma/schema.prisma) with your changes:
- Add new models
- Modify field types or constraints
- Update relationships
- Follow the naming convention:
  - `info__*`: Static master data
  - `quote__*`: Timeseries data
  - `summary__*`: Analysis outputs
  - `indicator__*`: Predictions/observations
  - `relation__*`: Junction tables

### 2. Regenerate Prisma Client (CRITICAL)
**In terminal:**
```bash
pnpm prisma generate
```

**What this does:**
- Regenerates TypeScript type definitions (`@prisma/client`)
- Updates Prisma query methods
- Validates schema syntax
- Fails fast if schema is invalid

**Quality check:** No TypeScript errors in IDE after this step.

### 3. Apply Schema to Database
Choose one based on environment:

#### Development or Local Testing
```bash
pnpm prisma db push
```
- Pushes schema changes directly to dev database
- Useful for rapid iteration
- **Caution**: May cause data loss if dropping columns (it warns first)

#### Production Setup (Recommended)
```bash
pnpm prisma migrate dev --name <meaningful_name>
```
Example:
```bash
pnpm prisma migrate dev --name add_stock_sentiment_field
```

**What this does:**
- Creates a migration file in `prisma/migrations/`
- Applies migration to dev database
- Generates reusable migration artifact for production deployment
- Tracks migration history in `_prisma_migrations` table

### 4. Verify Database Sync
**Option A: Visual inspection** (recommended during development)
```bash
pnpm prisma studio
```
- Opens Prisma Studio at `http://localhost:5555`
- Browse tables, inspect schema changes
- Verify relations and constraints visually

**Option B: Query check**
```bash
pnpm prisma db execute --stdin <<EOF
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'streaks_of_good_luck';
EOF
```

### 5. Update TypeScript Code
Import the new types or use updated models:
```typescript
import { info__predict, quote__stock_constituent_daily } from '@prisma/client';

// Now TypeScript recognizes your new models/fields
const newRecord = await prisma.info__predict.create({
  data: {
    // Your new field is now available in IDE autocomplete
  },
});
```

### 6. Test Before Committing
**Required checks:**
```bash
pnpm tsc --noEmit          # TypeScript validation
pnpm prisma migrate status # Check migration readiness
pnpm prisma studio        # Final visual inspection
```

## Decision Tree

**Question**: Should I use `db push` or `migrate dev`?

```
Are you in production? 
  → YES: Use `migrate dev` (creates permanent migration) → deploy with `migrate deploy`
  → NO: Use `db push` for rapid dev iteration
  
Is this a breaking change (dropping columns/tables)?
  → YES: Consider data migration script in migration file
  → NO: Simple schema change, `db push` or `migrate dev` both fine
  
Is this for the dev team?
  → YES: `migrate dev` creates versioned artifacts (everyone stays in sync)
  → NO: Personal exploration, `db push` is fine
```

## Common Scenarios

### Scenario A: Add a New Field to Existing Model
```prisma
model info__predict {
  // ... existing fields
  confidence_score Float?  // new field
}
```

**Steps:**
1. Edit `schema.prisma`
2. Run `pnpm prisma generate`
3. Run `pnpm prisma db push` (or `migrate dev --name add_confidence_score`)
4. Update consumers of `info__predict` to use the new field

### Scenario B: Create Junction Table for Many-to-Many
```prisma
model relation__stock_industry {
  id          Int    @id @default(autoincrement())
  stock_id    BigInt
  industry_id Int
  stock       info__stock_company @relation(fields: [stock_id], references: [id])
  industry    info__industry       @relation(fields: [industry_id], references: [id])

  @@unique([stock_id, industry_id])
}
```

**Steps:**
1. Add both the junction model and foreign key relations to existing models
2. Run `pnpm prisma generate`
3. Run `pnpm prisma migrate dev --name create_stock_industry_relation`
4. Deploy migration to production

### Scenario C: Fix TypeScript Errors After Editing schema.prisma
**Symptom**: "Property 'X' does not exist on type 'info__predict'" after schema edit

**Fix:**
1. Confirm `schema.prisma` is saved
2. Run `pnpm prisma generate`
3. Restart TypeScript server in IDE (Cmd+Shift+P → "TypeScript: Restart TS Server")
4. Errors should resolve

## Quality Criteria

✅ `pnpm prisma generate` runs without errors  
✅ `pnpm tsc --noEmit` passes (no TypeScript errors)  
✅ Database schema in `pnpm prisma studio` matches edited models  
✅ Existing queries still work (backward-compatible change)  
✅ Migration file created and reviewed (if using `migrate dev`)  
✅ New fields have appropriate `@default()` or `?` (nullable) for existing records  

## Gotchas

| Issue | Cause | Solution |
|-------|-------|----------|
| TypeScript errors persist after edit | Ran edit but skipped `generate` | Always run `pnpm prisma generate` first |
| `db push` refuses schema change | Destructive change (column drop) | Use `migrate dev` with data migration, or manually handle data first |
| Migration file has unexpected SQL | Schema conflict or constraint issue | Review generated SQL in `prisma/migrations/[timestamp]/migration.sql` |
| BigInt fields become strings in API responses | JSON serialization (not schema issue) | Handled by `lib/db.ts` setup; no action needed |

## References
- Schema file: [`prisma/schema.prisma`](../../prisma/schema.prisma)
- Data models doc: [Data Models & Naming Convention section in copilot-instructions.md](../../.github/copilot-instructions.md#data-models--naming-convention)
- Prisma docs: https://www.prisma.io/docs/orm/prisma-schema
