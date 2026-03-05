# Puffed Development Guidelines

## 🚨 CRITICAL: Bundle Size Limit

Cloudflare Pages has a **25MB limit** for Pages Functions.

**Current state (ab86712):** 241 API routes, ~414 total files — WORKING

**What broke it:** Adding 100+ new API routes pushed bundle to 39MB.

## Rules (as of Mar 4, 2026)

### DO NOT:
- Add new pages/routes without explicit approval
- Push repeatedly after a failed deploy — STOP and diagnose
- Add CI/CD integrations without approval
- Make data model changes without tracking them

### DO:
- Check `routes-inventory.csv` before adding routes
- Run `npx tsc --noEmit` before pushing
- Verify deploys are working before adding more features
- Get approval for anything beyond frontend UX fixes

### Data Model Changes
Any schema changes MUST be documented in `schema-changelog.md` with:
- Date
- What changed
- Migration steps if needed
- Affected users/entities

## Route Inventory

See `routes-inventory.csv` for full mapping of all pages and API routes.

Format: `type,path,status,added_date,description`

**Before adding a route:** Update the CSV with status=pending, get approval.

## Why This Matters

~200 pushes failed because I kept building without checking if deploys worked.
This wasted time, created confusion, and blocked actual progress.

Stop. Check. Then proceed.
