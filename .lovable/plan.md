 

# KVS Arrangement — Full Stack App Plan

Build a complete, official-feeling, ready-to-launch school arrangement app for PM SHRI KVS No. 2. Keep the current clean home page style. No blue anywhere. No Google login. No activity/logs section. Use the KVS logo you uploaded.

## Color Palette (no blue at all)

- Background: warm ivory `#FBF7EE`
- Surface: white with soft shadow
- Primary text / dark: deep charcoal `#1A1A1A`
- Accent 1: KVS gold `#C8A14A`
- Accent 2: KVS maroon `#8A1F2B` (used in current footer)
- Subtle support: muted saffron + green only inside the logo and tiny badges
- Borders: warm stone `#E8E1D0`

## Branding

- Use uploaded KVS logo (`download.png`) everywhere — header, landing hero, login, favicon, loading state
- Single serif display font for titles (matches current home), clean sans for body
- Footer on every page: "Developed & Programmed by Vivek Thapa and Nikunj Kumar" on maroon band

## Pages & Navigation

1. **Home / Role Selection** — keep exactly like the current screenshot (logo, title, Student / Admin cards, top nav, maroon footer). No changes to layout.
2. **Student View** (public, no login)
  - Top bar with KVS logo + app name
  - Large hero showing the latest active arrangement (image or PDF preview)
  - Title, date, download button
  - Elegant horizontal strip / responsive grid of previous arrangements below
  - Click a previous one → opens it in the hero with smooth fade
  - Smartboard kiosk-friendly (huge tap targets, readable from distance)
  - Footer
3. **Admin Login**
  - Centered premium card, email + password only (no Google, no signup link visible)
  - Forgot password link → reset flow via email
  - Footer
4. **Admin Dashboard** (protected, sidebar layout)
  Sidebar items:
  - Dashboard (summary cards: total arrangements, active arrangement, total admins)
  - Upload Arrangement
  - Manage Arrangements
  - Manage Admins
  - Profile
  - Logout
5. **Upload Arrangement**
  - Drag-and-drop or file picker (image or PDF)
  - Title, date, optional note, active toggle
  - Preview before submit
  - Setting one active automatically archives the previous active one
6. **Manage Arrangements**
  - Clean table: thumbnail, title, date, uploaded by, status badge, actions
  - Actions: set active, archive, delete, download
  - Search + filter by status
7. **Manage Admins** (super-admin only)
  - Table of admins with email, role (super admin / admin), date added
  - Invite new admin by email (creates account + sends temp password email)
  - Change role, remove admin
  - Regular admins see this page as read-only with a notice
8. **Profile Edit**
  - Display name, email (read-only), change password
  - Save with confirmation toast
9. **Reset Password page** at `/reset-password`
10. **404 page** in matching style

## Backend (Lovable Cloud)

**Auth**: email + password only. First user to sign up becomes super admin automatically; after that, signup is disabled — new admins can only be invited from Manage Admins.

**Database tables**:

- `profiles` — id (FK auth.users), display_name, created_at
- `user_roles` — id, user_id, role (`super_admin` | `admin`) — separate table per security best practice with `has_role()` security definer function
- `arrangements` — id, title, note, file_url, file_type (image/pdf), arrangement_date, is_active, uploaded_by, created_at

**Storage bucket**: `arrangements` (public read so students can view without login; only authenticated admins can upload/delete).

**RLS policies**:

- Arrangements: public SELECT; INSERT/UPDATE/DELETE only for authenticated admins
- Profiles: users read/update own; admins read all
- User_roles: only super_admin can INSERT/UPDATE/DELETE; everyone authenticated can SELECT their own
- Trigger to auto-create profile on signup
- Trigger / server function to enforce single active arrangement (sets others to archived)

## Responsiveness

- Mobile (phones): stacked cards, hamburger sidebar
- Tablet: 2-column grids
- Laptop / desktop: full sidebar + content
- Smartboard / kiosk (≥1920px): larger hero, bigger fonts, generous spacing

## Motion (kept minimal — official app)

- Subtle fade-in on page load
- Smooth image swap in student view
- Soft hover lift on cards
- No bouncy / flashy animations

## Tech Notes

- TanStack Start (existing stack), shadcn/ui components
- Lovable Cloud (Supabase) for auth, DB, storage
- Server functions for admin invitations and role checks
- Footer + header as shared layout components
- Mock data removed once Cloud is wired

## Out of Scope (per your instructions)

- No blue accents anywhere
- No Google sign-in
- No activity/logs page
- No heavy animations
- No clutter on home page (keep current look)  
  
  
  
  
Revise the plan carefully and remove Google login completely from the entire app.
  Important corrections:
  - No Google sign-in anywhere in the app.
  - No Google auth UI.
  - No Google OAuth logic.
  - No future Google login architecture in this version.
  - Keep the authentication system safer and simpler with only email/password.
  Design / branding
  - Keep the premium ivory / white / gold / maroon style exactly as planned.
  - No blue anywhere.
  - Keep the uploaded KVS logo everywhere.
  - Keep the current clean home style as the base.
  - Make the app premium, elegant, polished, and official.
  - Do not clutter the UI.
  - Do not make it look AI-generated.
  - Footer on all pages must be a single line:
  Developed & Programmed by Vivek Thapa ([itsvivekthapa@gmail.com](mailto:itsvivekthapa@gmail.com)) and Nikunj Kumar ([nikunj.010218@kvsrodelhi.in](mailto:nikunj.010218@kvsrodelhi.in))
  Authentication
  - Use email/password only.
  - Remove Google login completely.
  - Keep forgot password.
  - Keep reset password flow.
  - Keep persistent session so admin stays logged in across refresh and reopen until logout or expiry.
  - Clicking Admin again should go directly to dashboard if session is valid.
  - First registered account becomes super admin automatically.
  - After first signup, disable public signup completely.
  - Super admin can add/manage admins from the dashboard.
  If real email sending is not configured yet:
  - keep a working in-app reset link fallback for forgot password
  - do not break the rest of the app
  Pages required
  1. Home / Role Selection
  - Keep exactly the current clean layout and style.
  2. Student View
  - Public, no login
  - Latest active arrangement hero
  - Previous arrangements grid/strip
  - Download support
  - Smartboard friendly
  3. Admin Login
  - Email/password only
  - Forgot password
  - No Google login at all
  - If session exists, go directly to dashboard
  4. Admin Dashboard
  Sidebar:
  - Dashboard
  - Upload Arrangement
  - Manage Arrangements
  - Manage Admins
  - Activity Logs
  - Profile
  - Logout
  5. Upload Arrangement
  - image/pdf upload
  - title
  - date
  - optional note
  - active toggle
  - preview
  - activating one archives previous active automatically
  6. Manage Arrangements
  - thumbnail
  - title
  - date
  - uploaded by
  - status
  - actions:
  set active
  archive
  delete
  download
  - search/filter
  7. Manage Admins
  - super admin control
  - add/remove admin
  - change roles
  8. Activity Logs
  - uploads
  - arrangement changes
  - admin changes
  - password changes
  - profile edits
  9. Profile
  - display name
  - email read-only
  - password change
  10. Reset Password page
  11. 404 page
  Motion / animation
  - Use premium polished motion.
  - Smooth page transitions.
  - Elegant fade, stagger, soft scale, refined hover states.
  - Do not make it flashy, childish, or laggy.
  - The motion should feel premium and high-end.
  Backend / system
  - Keep the Lovable Cloud / Supabase backend.
  - Keep auth, database, storage, roles, and RLS.
  - Keep storage bucket for arrangements.
  - Keep tables:
  profiles
  user_roles
  arrangements
  - Keep public student access.
  - Keep admin-protected routes.
  - Keep super admin role management.
  - Keep single active arrangement enforcement.
  Important safety rule
  - Do not include Google login in any part of this build.
  - Do not leave any Google auth code, button, redirect, or placeholder.
  - Remove it fully so the system stays simpler and safer.
  Export / deploy
  - The app must remain export-ready and deploy-ready.
  - No hidden preview-only behavior.
  - No broken auth after export.
  - No redirect issues.
  - No missing backend wiring.
  - No broken links.
  - No unfinished buttons.
  - No silly mistakes.
  Final goal
  Build the full premium KVS Arrangement app with:
  - home
  - student view
  - admin login
  - forgot/reset password
  - persistent session
  - upload arrangements
  - manage arrangements
  - manage admins
  - activity logs
  - profile
  - premium animations
  - responsive layout
  - export-ready structure
  - no Google login anywhere
  - no views count
  - no clutter
  - no broken auth
  - no missing features
  Please implement it carefully and completely.  
    
    
    
    
