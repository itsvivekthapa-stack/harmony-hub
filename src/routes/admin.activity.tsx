import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/activity")({
  component: ActivityLogsPage,
});

type LogRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target: string | null;
  details: any;
  created_at: string;
};

const LABELS: Record<string, string> = {
  "setup.super_admin_created": "Super admin created (initial setup)",
  "admin.created": "Admin account created",
  "admin.removed": "Admin account removed",
  "admin.role_changed": "Admin role changed",
  "admin.password_reset": "Admin password reset",
  "arrangement.uploaded": "Arrangement uploaded",
  "arrangement.activated": "Arrangement set active",
  "arrangement.archived": "Arrangement archived",
  "arrangement.deleted": "Arrangement deleted",
  "profile.updated": "Profile updated",
  "profile.password_changed": "Password changed",
};

function ActivityLogsPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as LogRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">Activity Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent actions across the portal.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No activity yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 p-4 sm:p-5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/30 text-foreground">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {LABELS[r.action] ?? r.action}
                    {r.target ? (
                      <span className="text-muted-foreground"> · {r.target}</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {r.actor_email ?? "system"} · {format(new Date(r.created_at), "d MMM yyyy, HH:mm")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
