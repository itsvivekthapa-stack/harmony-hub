# Stabilize Admin System + Performance + Approval Flow

## Problems Confirmed

1. `**listAdmins` runtime crash → "[object Response]" + blank screen.**
  `requireSupabaseAuth` middleware throws raw `Response` objects when the auth header is missing/invalid. When the page is opened before the Supabase session hydrates (or after a stale token), the server function rejects with a `Response`, which surfaces in the browser as the unhelpful `[object Response]` error and a blank screen.
2. **Admin count mismatch.**
  `admin.index.tsx` counts rows in `user_roles` (which can include duplicates / pending rows) while `admin.admins.tsx` shows admins joined via `profiles`. Different sources → different numbers.
3. **No approval workflow.**
  Current trigger auto-promotes the first user to `super_admin` and every later signup to `admin`. There's no public signup, no "pending" state, and no approve/reject UI.
4. **No global Student/Admin switch.**
  The admin layout has its own sidebar; there's no consistent top bar to jump between Student and Admin areas from anywhere in the app.
5. **Slow + frequent "Something went wrong".**
  - No request caching → every navigation refetches.
  - No error boundary → any thrown error blanks the screen.
  - Auth context delays role load with `setTimeout`, gating the whole admin shell.

## Plan

### 1. Fix the crash (root cause)

- **Rewrite `requireSupabaseAuth**` to never throw raw `Response`. Throw `Error("UNAUTHENTICATED")` instead; the server-fn pipeline serializes that into a normal JSON error.
- **Wrap every server-fn handler** (`listAdmins`, `createAdmin`, `changeAdminRole`, `removeAdmin`, `resetAdminPassword`, `approveAdmin`, `rejectAdmin`, `getSetupStatus`, `bootstrapSuperAdmin`) in `try/catch` returning `{ ok: false, error: string }` — never throw.
- **Client side**: every server-fn call wrapped in `try/catch`; on failure show a toast, never crash.

### 2. Approval-based role system

**DB migration:**

- Extend `app_role` enum with `pending_admin`.
- Update `handle_new_user` trigger:
  - First ever signup → `super_admin`.
  - Every other signup → `pending_admin` (not `admin`).
- Add RLS policy: super admins can `UPDATE`/`DELETE` `user_roles`; pending users can read their own role row.

**Public signup page** at `/admin/signup`:

- Email + password + display name → creates an auth user (which becomes `pending_admin` via trigger).
- Shows "Account submitted — waiting for super admin approval".

**Approval UI in Manage Admins:**

- Section "Pending approvals" listing `pending_admin` users with **Approve** (→ `admin`) and **Reject** (delete user) buttons.
- Section "Active admins" with role switch (`admin` ↔ `super_admin`), reset password, remove. Last super-admin protection retained.

**New server functions:**

- `listPendingAdmins`, `approveAdmin({user_id})`, `rejectAdmin({user_id})`.
- Remove the manual "Create admin with email+password" form (per request: signups, not creation). Keep `resetAdminPassword` for emergency recovery.

### 3. Single source of truth for counts

- New `getAdminStats` server function (admin-protected) returns `{ totalArrangements, activeArrangement, adminCount, pendingCount }`. Both Dashboard and Manage Admins use the same numbers.
- `adminCount` only counts `role IN ('admin','super_admin')` distinct users.

### 4. Global top navigation

- Add a slim top bar to the **admin layout** (`src/routes/admin.tsx`) with two pill links: **Student** (→ `/student`) and **Admin** (→ `/admin`). Same bar already exists on student/home via `SiteHeader` — extend it so admin pages also see it sticky at the top alongside the existing sidebar.

### 5. Performance

- Add `**@tanstack/react-query**` with a `QueryClientProvider` in `__root.tsx`.
- Convert all data fetches (admins list, pending list, dashboard stats, arrangements) to `useQuery` with sensible `staleTime` (30s) so navigation is instant after first load.
- Remove the `setTimeout(loadRole, 0)` in `auth-context.tsx`; load role inline so the admin shell stops waiting.
- Drop the 600ms "kick out" timer in `admin.tsx`; rely on synchronous role check.
- Memoize sidebar list.

### 6. Error boundary + nicer fallback

- Add a top-level `ErrorBoundary` component used by `__root.tsx` and route-level `errorComponent` on every admin route showing a friendly card + Retry button (calls `router.invalidate()`), never a blank screen.

### 7. Cleanup

- Remove `createAdmin` form usage from UI (function kept for migration but unused).
- Keep activity log writes for `admin.approved`, `admin.rejected`, `admin.role_changed`, `admin.removed`, `admin.password_reset`.

## Files Touched (technical)

- `src/integrations/supabase/auth-middleware.ts` — throw `Error`, not `Response`.
- `src/server/admins.functions.ts` — add `listPendingAdmins`, `approveAdmin`, `rejectAdmin`, `getAdminStats`; harden all handlers with try/catch.
- `src/server/setup.functions.ts` — same hardening.
- `src/routes/admin.admins.tsx` — pending + active sections, react-query.
- `src/routes/admin.index.tsx` — use `getAdminStats`, react-query.
- `src/routes/admin.signup.tsx` — new public signup page.
- `src/routes/admin.login.tsx` — link to signup.
- `src/routes/admin.tsx` — top Student/Admin bar, remove timeout gate.
- `src/routes/__root.tsx` — `QueryClientProvider`, `ErrorBoundary`.
- `src/components/ErrorBoundary.tsx` — new.
- `src/lib/auth-context.tsx` — inline role load.
- `supabase/migrations/<new>.sql` — add `pending_admin` to enum, update trigger, RLS for approvals.

## Out of Scope

- Email-based invitations (explicitly not wanted).
- Google login (explicitly not wanted).
- Activity logs UI changes (kept as-is).  
  
  

  Runtime errorTry to fix
  Error: [object Response]
  {  
    "timestamp": 1777730975852,  
    "error_type": "RUNTIME_ERROR",  
    "filename": "https://localhost:8080/_serverFn/eyJmaWxlIjoiL0BpZC9zcmMvc2VydmVyL2FkbWlucy5mdW5jdGlvbnMudHM_dHNzLXNlcnZlcmZuLXNwbGl0IiwiZXhwb3J0IjoibGlzdEFkbWluc19jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0",  
    "lineno": 0,  
    "colno": 0,  
    "stack": "Unavailable",  
    "has_blank_screen": true  
  }  
    
  and also i need that in ange admins all admins can see who are like who are admin n super admins, and onyl super admin can manage admins or other superadmins, like right now there is manageadmin like we make there accoutn btu we dotn need this we need something, like they make account and we approve like, you can be the admin means like if some tecaher make there account signup ofr first time, so whoever suepradmin, can approve hi or decline thsi type of system so suepradmin can onyl dotn maek thign diff, btu actualy diclin aprovign, adn also in , mage admins, i need  the we can manege or  change role or kick him or these featurs lke on thteh view list fo admin try to udnerstadn and yes try to udnerstand everything, and also i haev 0 credt left btu i knw  u suse claude so u can do it, and also whole web app is full of loadings i emans it does open but to slow app bro to slwo laoding liek for 5 misn -3 too slwo i nee dlgihtign speed, so fix these to manage admins one and slow problem. and one more relaetd to in dashboboard it shwos 2 DMINS BUT IN MANAGE ADMINS IT DOTN SHWO THAT 2A DMINS SAY NO AMDINS YET SO SO MUCH BUGS AND SO MUCH FEATURE NEE DTO BE ADDED ACORDIGN THAT I HAEV TOLD YOU , , and oen mroe thign that if we ned admin dashboard there no nav or soemthign to go to student or admin so in top of there alwasy need student, and admin so to switch that udnerstand, last oen more that if it too slow soemtimes it give somethign went wron an unexpected eror occured please tr again the whoel thign is very laoding vibe to slow so not good so yep fix this all things, and somethign went wrong expect eeror comes everytime it is too common ,  so yep remove thsi thing too, bro self test everythign by your self please   
    
    
  Hey, I need you to fix multiple critical issues in my web app. Please read everything carefully and implement properly with testing.
  🔴 1. Runtime Crash (HIGH PRIORITY)
  I am getting this error:  
  Error: [object Response]  
  From server function:  
  listAdmins_createServerFn_handler
  This causes:
  Blank screen
  No stack trace
  👉 Fix:
  Do NOT throw raw Response objects
  Always parse response and throw proper Error
  Add proper error handling + logs
  🟡 2. Admin Data Mismatch
  Problem:
  Dashboard shows 2 admins
  Manage Admins page shows "No admins yet"
  👉 Fix:
  Use single source of truth (same DB query everywhere)
  Ensure role filter includes both:
  admin
  superadmin
  Fix any case-sensitive issues (admin vs Admin)
  🟢 3. Proper Role System (IMPORTANT FEATURE)
  Current system is wrong (manual admin creation)
  I need this instead:
  Roles:
  user (default)
  pending_admin (new signup)
  admin
  superadmin
  Flow:
  Teacher signs up → role = pending_admin
  Superadmin can:
  Approve → becomes admin
  Reject → delete or keep as user
  👉 Only superadmin can:
  Approve / reject admins
  Change roles
  Remove (kick) admins
  🟣 4. Manage Admin Panel (FULL SYSTEM)
  I need a proper admin management UI:
  Table with:
  Name
  Role
  Status (active / pending)
  Actions
  Actions:
  Approve (for pending)
  Reject
  Change Role (admin ↔ superadmin)
  Remove/Kick
  🔵 5. Navigation Issue
  There is NO way to switch between:
  Student Dashboard
  Admin Dashboard
  👉 Fix:
  Add top navigation bar with:
  "Student"
  "Admin"
  Must be visible globally
  ⚡ 6. EXTREME PERFORMANCE ISSUE (CRITICAL)
  App is VERY slow:
  Takes 3–5 minutes to load
  Constant loading states
  Sometimes shows: "Something went wrong"
  👉 Fix:
  Reduce API calls (combine endpoints)
  Add caching (React Query or similar)
  Remove unnecessary re-renders
  Optimize server functions
  Ensure production build works fast
  Fix infinite loading states
  🚫 7. Error Handling Problem
  Currently:
  Shows "Something went wrong" too often
  No useful feedback
  👉 Fix:
  Show real error messages
  Add proper try/catch
  Prevent full app crash
  ⚪ 8. Blank Screen Handling
  👉 Add:
  Error Boundary
  Fallback UI instead of blank screen
  🧪 9. Testing Requirement
  After implementing:
  Test all flows:
  Admin approval
  Role change
  Data consistency
  Navigation
  Ensure NO blank screen
  Ensure FAST loading
  🎯 Final Goal
  Fast (no long loading)
  Stable (no crashes)
  Clean admin system with approval flow
  Consistent data across dashboard
  Please fix everything properly and do not leave partial implementations.  
    
  Runtime errorTry to fix
  Error: [object Response]
  {  
    "timestamp": 1777730975852,  
    "error_type": "RUNTIME_ERROR",  
    "filename": "https://localhost:8080/_serverFn/eyJmaWxlIjoiL0BpZC9zcmMvc2VydmVyL2FkbWlucy5mdW5jdGlvbnMudHM_dHNzLXNlcnZlcmZuLXNwbGl0IiwiZXhwb3J0IjoibGlzdEFkbWluc19jcmVhdGVTZXJ2ZXJGbl9oYW5kbGVyIn0",  
    "lineno": 0,  
    "colno": 0,  
    "stack": "Unavailable",  
    "has_blank_screen": true  
  }  
    
  and also i need that in ange admins all admins can see who are like who are admin n super admins, and onyl super admin can manage admins or other superadmins, like right now there is manageadmin like we make there accoutn btu we dotn need this we need something, like they make account and we approve like, you can be the admin means like if some tecaher make there account signup ofr first time, so whoever suepradmin, can approve hi or decline thsi type of system so suepradmin can onyl dotn maek thign diff, btu actualy diclin aprovign, adn also in , mage admins, i need  the we can manege or  change role or kick him or these featurs lke on thteh view list fo admin try to udnerstadn and yes try to udnerstand everything, and also i haev 0 credt left btu i knw  u suse claude so u can do it, and also whole web app is full of loadings i emans it does open but to slow app bro to slwo laoding liek for 5 misn -3 too slwo i nee dlgihtign speed, so fix these to manage admins one and slow problem. and one more relaetd to in dashboboard it shwos 2 DMINS BUT IN MANAGE ADMINS IT DOTN SHWO THAT 2A DMINS SAY NO AMDINS YET SO SO MUCH BUGS AND SO MUCH FEATURE NEE DTO BE ADDED ACORDIGN THAT I HAEV TOLD YOU , , and oen mroe thign that if we ned admin dashboard there no nav or soemthign to go to student or admin so in top of there alwasy need student, and admin so to switch that udnerstand, last oen more that if it too slow soemtimes it give somethign went wron an unexpected eror occured please tr again the whoel thign is very laoding vibe to slow so not good so yep fix this all things, and somethign went wrong expect eeror comes everytime it is too common ,  so yep remove thsi thing too, bro self test everythign by your self please   
    
    
  AND DO IT UNDER 5 CREDITS AND IN END I NEED NO ERROS NO LLOADING NO SLOWNESS, AND IN END THSI FULL WEB APP READY FOR EVEYRHTIGN OKAY BETTER YOU DO JOB PROFEOSNALLY!!!  
