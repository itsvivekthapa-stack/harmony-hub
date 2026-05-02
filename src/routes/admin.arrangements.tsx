import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Trash2, Archive, CheckCircle2, Search, Loader2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/arrangements")({
  component: ManageArrangements,
});

type Row = {
  id: string;
  title: string;
  arrangement_date: string;
  file_url: string;
  file_path: string;
  file_type: string;
  is_active: boolean;
  uploaded_by: string | null;
};

function ManageArrangements() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("arrangements")
      .select("id,title,arrangement_date,file_url,file_path,file_type,is_active,uploaded_by")
      .order("is_active", { ascending: false })
      .order("arrangement_date", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setActive = async (id: string, title: string) => {
    const { error } = await supabase.from("arrangements").update({ is_active: true }).eq("id", id);
    if (error) return toast.error(error.message);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      actor_id: u.user?.id ?? null,
      actor_email: u.user?.email ?? null,
      action: "arrangement.activated",
      target: title,
    });
    toast.success("Set as active");
    load();
  };
  const archive = async (id: string, title: string) => {
    const { error } = await supabase.from("arrangements").update({ is_active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      actor_id: u.user?.id ?? null,
      actor_email: u.user?.email ?? null,
      action: "arrangement.archived",
      target: title,
    });
    toast.success("Archived");
    load();
  };
  const remove = async (row: Row) => {
    await supabase.storage.from("arrangements").remove([row.file_path]);
    const { error } = await supabase.from("arrangements").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      actor_id: u.user?.id ?? null,
      actor_email: u.user?.email ?? null,
      action: "arrangement.deleted",
      target: row.title,
    });
    toast.success("Deleted");
    load();
  };

  const filtered = rows.filter((r) => {
    if (filter === "active" && !r.is_active) return false;
    if (filter === "archived" && r.is_active) return false;
    if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">Manage Arrangements</h1>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title…" className="pl-9" />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "archived"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No arrangements found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                  {r.file_type === "image" ? (
                    <img src={r.file_url} alt={r.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{r.title}</div>
                    {r.is_active ? (
                      <Badge className="bg-gold text-gold-foreground hover:bg-gold">Active</Badge>
                    ) : (
                      <Badge variant="outline">Archived</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(r.arrangement_date), "d MMM yyyy")} · {r.file_type.toUpperCase()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={r.file_url} target="_blank" rel="noreferrer" download>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </a>
                  </Button>
                  {r.is_active ? (
                    <Button variant="outline" size="sm" onClick={() => archive(r.id, r.title)}>
                      <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setActive(r.id, r.title)}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Set active
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete arrangement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes "{r.title}" and its file. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(r)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
