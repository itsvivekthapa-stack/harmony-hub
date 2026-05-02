import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — KVS Arrangement" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("If that email exists, a reset link has been sent.");
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-md px-4 py-14 sm:py-20">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Forgot password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your admin email and we'll send a reset link.
        </p>
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting || sent} className="w-full bg-primary text-primary-foreground hover:opacity-90">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sent ? "Email sent" : "Send reset link"}
          </Button>
          <Link to="/admin/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">
            ← Back to sign in
          </Link>
        </form>
        <p className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Can't receive emails?</strong> Ask your
          super admin to reset your password directly from the Manage Admins page.
        </p>
      </section>
    </PageShell>
  );
}
