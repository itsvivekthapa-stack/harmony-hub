import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Upload,
  ListChecks,
  Users,
  UserCircle2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import logo from "@/assets/kvs-logo.png";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/upload", label: "Upload Arrangement", icon: Upload },
  { to: "/admin/arrangements", label: "Manage Arrangements", icon: ListChecks },
  { to: "/admin/admins", label: "Manage Admins", icon: Users },
  { to: "/admin/profile", label: "Profile", icon: UserCircle2 },
];

function AdminLayout() {
  const { user, loading, signOut, role } = useAuth();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/admin/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <img src={logo} alt="KVS" className="h-7 w-7 object-contain" />
          <span className="font-serif text-base font-semibold">KVS Arrangement</span>
        </Link>
        <button
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-2 hover:bg-accent"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`${mobileOpen ? "block" : "hidden"} lg:block w-full border-r border-border bg-card lg:sticky lg:top-0 lg:h-screen lg:w-64 xl:w-72`}
        >
          <div className="hidden items-center gap-3 border-b border-border px-6 py-5 lg:flex">
            <img src={logo} alt="KVS" className="h-9 w-9 object-contain" />
            <div className="leading-tight">
              <div className="font-serif text-base font-semibold">KVS Arrangement</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Admin Panel
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1 p-3 lg:p-4">
            {NAV.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                activeOptions={{ exact: !!exact }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{
                  className:
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-primary text-primary-foreground",
                }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            <div className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Signed in as
            </div>
            <div className="rounded-lg bg-muted px-3 py-2.5 text-xs">
              <div className="truncate font-medium text-foreground">{user.email}</div>
              <div className="mt-0.5 inline-block rounded-full bg-gold/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/70">
                {role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "User"}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="mt-3 w-full justify-start"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </nav>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
