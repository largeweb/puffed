# Puffed Page Status Tracking

Last updated: Mar 7, 2026

## Legend
- ✅ Working
- ⚠️ Missing sidebar
- ❌ Error/broken
- 🔧 Needs fix
- 🚧 Coming soon (not implemented)

## Core Pages (High Priority)

| Page | Route | Sidebar | Auth | Status | Notes |
|------|-------|---------|------|--------|-------|
| Dashboard | /dashboard | ✅ | ✅ | ✅ | Main hub |
| Discover | /discover | ⚠️ | ✅ | 🔧 | Missing sidebar |
| Search | /search | ⚠️ | ✅ | 🔧 | Missing sidebar |
| Gallery | /gallery | ⚠️ | ✅ | 🔧 | Missing sidebar |
| Find People | /people | ⚠️ | ✅ | 🔧 | Missing sidebar |
| Settings | /settings | ? | ✅ | ? | Check |

## Social Pages

| Page | Route | Sidebar | Auth | Status | Notes |
|------|-------|---------|------|--------|-------|
| Smoke Time Twins | /twins | ⚠️ | ❌ | 🔧 | "Failed to find" - needs fix |
| Following Feed | /following | ⚠️ | ❌ | ❌ | Redirects to signup (BUG) |
| Leaderboard | /leaderboard | ⚠️ | ✅ | 🔧 | Missing sidebar |
| The Crown | /crown | ⚠️ | ❌ | ❌ | Client-side error |
| The Spark | /the-spark | ⚠️ | ❌ | 🔧 | Redirects to dashboard |
| The Porch | /the-porch | ⚠️ | ✅ | 🔧 | Missing sidebar |
| Platform Pulse | /platform-pulse | ⚠️ | ✅ | 🔧 | Missing sidebar |
| MVP Awards | /mvp-awards | ⚠️ | ❌ | ❌ | Client-side error |
| Smoke Council | /council | ⚠️ | ❌ | ❌ | "Failed to load" |
| Weekly Recap | /weekly-recap | ⚠️ | ✅ | 🔧 | Has back button instead of sidebar |
| Weekly Wrap | /weekly-wrap | ⚠️ | ❌ | ❌ | Auth check broken |
| Smoke Score | /smoke-score | ⚠️ | ❌ | ❌ | Auth check broken |
| Invite Friends | /invite | ⚠️ | ❌ | ❌ | Auth check broken |

## Tools Pages

| Page | Route | Sidebar | Auth | Status | Notes |
|------|-------|---------|------|--------|-------|
| Smoke Weather | /weather | ⚠️ | ✅ | 🔧 | Has back button instead of sidebar |
| Brand Tier List | /tier-list | ⚠️ | ✅ | 🔧 | Missing sidebar |
| Wishlist | /wishlist | ? | ? | ? | Check |

## Issues Summary

### 1. Missing Sidebar (Priority: HIGH)
Almost all pages except dashboard are missing the MobileSidebar.
**Fix:** Create shared PageWrapper component or add to layout.

### 2. Auth Detection Broken (Priority: HIGH)
These pages incorrectly show "please login":
- /following
- /weekly-wrap
- /smoke-score
- /invite
**Fix:** Check cookie/session detection in these pages.

### 3. Client-Side Errors (Priority: HIGH)
- /crown - Application error
- /mvp-awards - Application error
**Fix:** Debug on localhost with dev tools.

### 4. API/Data Errors (Priority: MEDIUM)
- /twins - "Failed to find smoke twins"
- /council - "Failed to load Smoke Council"
**Fix:** Check API endpoints exist and return proper data.

## Navigation Requirements

All authenticated pages MUST have:
1. MobileSidebar hamburger button (top-left on mobile)
2. Consistent header layout
3. Working logout functionality

## Deployment Checklist

Before pushing any page changes:
1. [ ] Run `npx tsc --noEmit`
2. [ ] Bump BUILD_VERSION in wrangler.jsonc
3. [ ] Check this file for required components
4. [ ] Test on localhost if possible
5. [ ] Push and verify on preview
6. [ ] Push to prod after preview verified
