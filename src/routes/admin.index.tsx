import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Users, CheckCircle2, Upload as UploadIcon, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, admins: 0, active: null as null | { title: string; date: string } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ count: total }, { count: admins }, { data: active }] = await Promise.all([
        supabase.from("arrangements").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }),
        supabase.from("arrangements").select("title, arrangement_date").eq("is_active", true).maybeSingle(),
      ]);
      setStats({
        total: total ?? 0,
        admins: admins ?? 0,
        active: active ? { title: active.title, date: active.arrangement_date } : null,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Overview</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Total arrangements"
          value={loading ? "—" : String(stats.total)}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Active arrangement"
          value={loading ? "—" : stats.active?.title ?? "None"}
          sub={stats.active ? format(new Date(stats.active.date), "d MMM yyyy") : undefined}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total admins"
          value={loading ? "—" : String(stats.admins)}
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-serif text-xl font-semibold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickAction
            to="/admin/upload"
            icon={<UploadIcon className="h-5 w-5" />}
            title="Upload an arrangement"
            desc="Add a new daily arrangement and set it active."
          />
          <QuickAction
            to="/admin/arrangements"
            icon={<FileText className="h-5 w-5" />}
            title="Manage arrangements"
            desc="View, archive, or delete previous arrangements."
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-foreground">{icon}</div>
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-4 truncate font-serif text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function QuickAction({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/30 text-foreground">{icon}</div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
