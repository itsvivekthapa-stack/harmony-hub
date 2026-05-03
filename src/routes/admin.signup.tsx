import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/kvs-logo.png";

export const Route = createFileRoute("/admin/signup")({
  head: () => ({
    meta: [
      { title: "Request Admin Access — KVS Arrangement" },
      { name: "description", content: "Sign up as a teacher and request admin access to KVS Arrangement portal." },
    ],
  }),
  component: AdminSignup,
});

function AdminSignup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/login`,
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (error) { toast.error(error.message); return; }
      setDone(true);
      // Sign out so they don't sit in a half-authenticated state
      await supabase.auth.signOut();
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign up");
    } finally { setSubmitting(false); }
  };

  return (
    <PageShell>
      <section className="mx-auto flex max-w-md flex-col items-center px-4 py-14 sm:py-20">
        <img src={logo} alt="KVS" className="h-14 w-14 object-contain" />
        <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight">
          {done ? "Request submitted" : "Request Admin Access"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {done
            ? "Your account is pending approval from a super admin. You'll be able to sign in once approved."
            : "Create an account. A super admin will review and approve your request."}
        </p>

        {!done ? (
          <form onSubmit={submit} className="mt-8 w-full space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Mr. Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.in" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <Button type="submit" size="lg" disabled={submitting} className="w-full bg-primary text-primary-foreground hover:opacity-90">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit request
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              Already approved? <Link to="/admin/login" className="underline underline-offset-2">Sign in</Link>
            </div>
          </form>
        ) : (
          <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
            <Button onClick={() => nav({ to: "/" })} className="bg-primary text-primary-foreground">Back to home</Button>
          </div>
        )}

        <Link to="/" className="mt-6 text-xs text-muted-foreground underline-offset-2 hover:underline">
          ← Back to home
        </Link>
      </section>
    </PageShell>
  );
}
