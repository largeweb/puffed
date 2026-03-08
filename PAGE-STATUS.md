# Puffed Page Status Tracking

Last updated: Mar 7, 2026 (v1.0.7)

## Legend
- ✅ Working
- 🔧 Fixed (sidebar added)
- ⚠️ Missing sidebar
- ❌ Error/broken
- 🚧 Coming soon (not implemented)

## Core Pages (High Priority) - FIXED ✅

| Page | Route | Sidebar | Status |
|------|-------|---------|--------|
| Dashboard | /dashboard | ✅ | ✅ |
| Discover | /discover | ✅ | 🔧 v1.0.3 |
| Search | /search | ✅ | 🔧 v1.0.3 |
| Gallery | /gallery | ✅ | 🔧 v1.0.3 |
| Find People | /people | ✅ | 🔧 v1.0.3 |

## Social Pages - FIXED ✅

| Page | Route | Sidebar | Status |
|------|-------|---------|--------|
| Following Feed | /following | ✅ | 🔧 v1.0.4 |
| Leaderboard | /leaderboard | ✅ | 🔧 v1.0.3 |
| The Porch | /the-porch | ✅ | 🔧 v1.0.3 |
| Platform Pulse | /platform-pulse | ✅ | 🔧 v1.0.3 |
| The Spark | /the-spark | ✅ | 🔧 v1.0.4 |
| Smoke Time Twins | /twins | ✅ | 🔧 v1.0.4 |
| Weekly Recap | /weekly-recap | ✅ | 🔧 v1.0.5 |

## Tools Pages - FIXED ✅

| Page | Route | Sidebar | Status |
|------|-------|---------|--------|
| Smoke Weather | /weather | ✅ | 🔧 v1.0.5 |
| Brand Tier List | /tier-list | ✅ | 🔧 v1.0.5 |

## Pages Still Needing Work

| Page | Route | Issue | Priority |
|------|-------|-------|----------|
| The Crown | /crown | ✅ Fixed v1.0.7 | DONE |
| MVP Awards | /mvp-awards | Fixed v1.0.8 | DONE |
| Smoke Council | /council | Failed to load | HIGH |
| Weekly Wrap | /weekly-wrap | Auth check broken | MEDIUM |
| Smoke Score | /smoke-score | Auth check broken | MEDIUM |
| Invite Friends | /invite | Auth check broken | MEDIUM |

## Auth Fixes (v1.0.2)

Fixed 17 APIs using wrong cookie name (`session_id` → `session`):
- following-feed, weekly-wrap, smoke-score, invite, and 13 more

Fixed 19 APIs using wrong column names (`liker_id` → `user_id`, `photo_url` → `image_url`)

## Navigation Requirements

All authenticated pages MUST have:
1. MobileSidebar hamburger button (top-left on mobile)
2. Use `useSidebar` hook from `/hooks/useSidebar.ts`
3. Import `MobileSidebar` from `@/app/components/MobileSidebar`

## Deployment Checklist

Before pushing any page changes:
1. [ ] Run `npx tsc --noEmit`
2. [ ] Bump BUILD_VERSION in wrangler.jsonc
3. [ ] Check this file for required components
4. [ ] Verify sidebar is added for new pages
5. [ ] Push and verify on preview
6. [ ] Push to prod after preview verified

## Code Pattern for Adding Sidebar

```tsx
// 1. Add imports
import { FiMenu } from "react-icons/fi";
import MobileSidebar from "@/app/components/MobileSidebar";
import { useSidebar } from "@/hooks/useSidebar";

// 2. Add hook in component
const { sidebarOpen, setSidebarOpen, currentUser, unreadCount, handleLogout } = useSidebar();

// 3. Add sidebar + fragment wrapper in return
return (
  <>
    <MobileSidebar
      isOpen={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      username={currentUser}
      unreadCount={unreadCount}
      onLogout={handleLogout}
    />
    <main>
      {/* Header with menu button */}
      <button onClick={() => setSidebarOpen(true)}>
        <FiMenu size={24} />
      </button>
      {/* ... rest of page */}
    </main>
  </>
);
```
