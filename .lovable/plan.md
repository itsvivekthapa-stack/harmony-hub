I will fix this as a system-level auth/admin hardening pass, not a surface UI change.

Key findings from inspection:
- The database currently has profiles and roles, but the real database trigger list is empty. That explains why first-user setup can become inconsistent: the app expects automatic profile/role creation, but the trigger is not actually present.
- The login page currently checks `user_roles` from the browser client with RLS. If logged out, that query can return zero even when admins exist, so it incorrectly shows “Create Super Admin” after logout.
- The admin route guard is component-level and can cause loading/redirect inconsistencies.
- Activity Logs are requested but not yet implemented.
- Google auth code is not present in the searched app code, but I will still keep email/password only and ensure no Google UI/logic is introduced.

Implementation plan:

1. Backend setup-state source of truth
- Add a server function that checks the real backend state using the server-side trusted client:
  - number of admin/super_admin roles
  - number of profiles
  - optional auth user count fallback
- The login page will use this server function, not frontend/RLS-limited queries, to decide:
  - zero admins/users -> First-time Create Super Admin
  - one or more admins/users -> Sign In
- This fixes the repeated setup screen after logout, refresh, deploy, and rebuild.

2. Repair database triggers and first-user role creation
- Add a migration to restore/ensure:
  - profile auto-creation on auth user creation
  - first user becomes `super_admin`
  - later signups do not create public signup loopholes in the UI
  - single active arrangement trigger exists
- Backfill missing profiles/roles safely if current data is inconsistent.
- Keep roles in `user_roles` only.
- Keep RLS enforced.

3. Harden first-time setup
- Replace frontend `signUpFirstAdmin` setup logic with a server-controlled first-admin creation function.
- It will create the first account only if there are truly zero admins/users.
- It will fail closed if an admin already exists and return a clear `setup_closed` response so the UI immediately switches to Sign In.
- If the email already exists, it will not trap the user; it will show “Account already exists. Please sign in.” and switch to Sign In.

4. Harden sign-in/session behavior
- Keep email/password only.
- Ensure session persists using the existing auth client storage.
- Improve auth context error handling so loading always resolves.
- After valid session:
  - `/admin/login` redirects to `/admin`
  - home Admin click effectively lands in dashboard
- After logout:
  - clear session
  - route to `/admin/login`
  - login page checks backend and shows Sign In, not setup.

5. Solid admin route protection
- Protect all dashboard routes consistently:
  - unauthenticated -> `/admin/login`
  - authenticated but no admin role -> unauthorized/sign out path
  - super-admin-only pages/actions -> backend enforced and UI hidden
- Manage Admins stays visible only where appropriate, with backend checks retained.
- Profile remains scoped to the logged-in user.
- Student pages stay public.

6. Forgot/reset password without breaking the app
- Keep forgot password and `/reset-password` page.
- Improve reset page to validate recovery/session state and avoid blank/dead states.
- If email reset sending is unavailable, keep a safe admin-controlled fallback: super admin can directly set/reset an admin password from Manage Admins. I will not create an insecure public reset bypass.

7. Admin management hardening
- Keep direct admin creation by super admin with email + password.
- Add/update clear password reset support for existing admins from the Manage Admins page.
- Backend will continue enforcing:
  - only super admins can create/change/remove admins
  - cannot remove last super admin
  - cannot self-remove
- Improve duplicate existing email handling.

8. Add Activity Logs feature
- Add `activity_logs` table with RLS:
  - admins can read logs
  - logs inserted by server-side trusted operations and/or authenticated admin actions
- Add `/admin/activity` route and sidebar item.
- Log important events:
  - first super admin setup
  - admin created/role changed/removed/password reset
  - arrangement uploaded/activated/archived/deleted
  - profile updated/password changed where practical
- Keep logs clean and official, not cluttered.

9. Arrangement operations reliability
- Keep upload, active toggle, archive, delete, download.
- Where needed, move sensitive arrangement mutations into server functions so they can consistently log activity and handle errors.
- Keep public read access for student view and admin-protected writes.

10. UI/branding cleanup
- No Google login anywhere.
- Keep ivory/white/gold/maroon palette, KVS logo, and no blue.
- Keep footer as one line on every page:
  `Developed & Programmed by Vivek Thapa (itsvivekthapa@gmail.com) and Nikunj Kumar (nikunj.010218@kvsrodelhi.in)`
- Keep UI official and uncluttered.
- Add refined, lightweight transitions only where they do not hurt performance.

11. Deploy/export safety
- Do not edit generated integration/type files manually.
- Do not rely on preview-only state, local flags, or localStorage for setup decisions.
- Use backend state for setup and roles.
- Use TanStack Start routes correctly; no Firebase-specific SPA hacks will be added. If you host elsewhere later, the built app must still use the connected backend and route structure correctly.

Expected final flow after implementation:

```text
First time only:
Home -> Admin -> Create Super Admin -> Dashboard

After first admin exists:
Home -> Admin -> Sign In -> Dashboard

Already signed in:
Home -> Admin -> Dashboard

After logout:
Logout -> Admin Sign In
Never Create Super Admin again unless the backend truly has zero users/admins.
```

After approval, I will implement the database migration, server functions, route/auth fixes, login page rewrite, activity logs route, and related UI adjustments carefully in one pass.