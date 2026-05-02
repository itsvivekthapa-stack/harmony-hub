import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { bootstrapSuperAdmin, getSetupStatus } from "@/server/setup.functions";
import { toast } from "sonner";
import logo from "@/assets/kvs-logo.png";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — KVS Arrangement" },
      { name: "description", content: "Secure admin sign-in for KVS Arrangement portal." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const { user, signIn, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already signed in, go straight to dashboard.
  useEffect(() => {
    if (!loading && user) nav({ to: "/admin", replace: true });
  }, [user, loading, nav]);

  // Source of truth: backend (service role) — not browser/RLS.
  const refreshSetupStatus = async () => {
    try {
      const res = await getSetupStatus();
      setNeedsBootstrap(!!res.setupRequired);
    } catch {
      // If the server check fails, default to Sign In (safer than trapping in setup)
      setNeedsBootstrap(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refreshSetupStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (needsBootstrap) {
        const res = await bootstrapSuperAdmin({
          data: { email, password, display_name: displayName || undefined },
        });
        if (!res.ok) {
          if (res.code === "setup_closed") {
            toast.error(res.error);
            // Switch to Sign In immediately
            setNeedsBootstrap(false);
            return;
          }
          // Existing email or other create failure → guide them to Sign In
          const msg = res.error || "Could not create account.";
          if (/already|registered|exists/i.test(msg)) {
            toast.error("That email already exists. Please sign in instead.");
            setNeedsBootstrap(false);
          } else {
            toast.error(msg);
          }
          return;
        }
        toast.success("Super admin created. Signing you in…");
        const { error: e2 } = await signIn(email, password);
        if (e2) {
          toast.error(e2);
          return;
        }
        nav({ to: "/admin" });
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Welcome back");
        nav({ to: "/admin" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <section className="mx-auto flex max-w-md flex-col items-center px-4 py-14 sm:py-20">
        <img src={logo} alt="KVS" className="h-14 w-14 object-contain" />
        <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight">
          {checking ? "Admin" : needsBootstrap ? "Create Super Admin" : "Admin Sign In"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {checking
            ? "Checking system status…"
            : needsBootstrap
              ? "No admin exists yet. Create the first super admin account."
              : "Enter your credentials to access the dashboard."}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 w-full space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
        >
          {checking ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {needsBootstrap && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Vice Principal"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.in"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!needsBootstrap && (
                    <Link
                      to="/admin/forgot-password"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={needsBootstrap ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground hover:opacity-90"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {needsBootstrap ? "Create & sign in" : "Sign in"}
              </Button>
            </>
          )}
        </form>

        <Link
          to="/"
          className="mt-6 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to home
        </Link>
      </section>
    </PageShell>
  );
}
