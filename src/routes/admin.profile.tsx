import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(data?.display_name ?? "");
      setLoading(false);
    })();
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd !== pwd2) return toast.error("Passwords don't match");
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setChangingPwd(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPwd(""); setPwd2(""); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">Profile</h1>
      </header>

      <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <h2 className="font-serif text-xl font-semibold">Account details</h2>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} readOnly className="bg-muted" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dn">Display name</Label>
          <Input
            id="dn"
            value={displayName}
            disabled={loading}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <h2 className="font-serif text-xl font-semibold">Change password</h2>
        <div className="space-y-1.5">
          <Label htmlFor="np">New password</Label>
          <Input id="np" type="password" minLength={8} required value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np2">Confirm new password</Label>
          <Input id="np2" type="password" minLength={8} required value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
        </div>
        <Button type="submit" disabled={changingPwd} className="bg-primary text-primary-foreground hover:opacity-90">
          {changingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}
