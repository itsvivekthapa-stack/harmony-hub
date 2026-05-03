import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Shield, KeyRound, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  listAdmins, changeAdminRole, removeAdmin, resetAdminPassword,
  approveAdmin, rejectAdmin,
} from "@/server/admins.functions";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/admins")({
  component: ManageAdmins,
});

type Row = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  role: "super_admin" | "admin" | "pending_admin";
  last_sign_in_at: string | null;
};

async function safeCall<T>(fn: () => Promise<T>, fallbackMsg = "Something failed"): Promise<T | null> {
  try { return await fn(); } catch (e: any) {
    console.error(e);
    toast.error(e?.message || fallbackMsg);
    return null;
  }
}

function ManageAdmins() {
  const { role, user } = useAuth();
  const isSuper = role === "super_admin";
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const res = await listAdmins();
      if (!res.ok) throw new Error(res.error || "Failed to load");
      return res;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const admins: Row[] = (data?.admins as Row[]) ?? [];
  const pending: Row[] = (data?.pending as Row[]) ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["admins"] });

  const onApprove = async (uid: string) => {
    const res = await safeCall(() => approveAdmin({ data: { user_id: uid } }));
    if (res?.ok) { toast.success("Approved"); refresh(); }
    else if (res && !res.ok) toast.error(res.error);
  };
  const onReject = async (uid: string) => {
    const res = await safeCall(() => rejectAdmin({ data: { user_id: uid } }));
    if (res?.ok) { toast.success("Rejected"); refresh(); }
    else if (res && !res.ok) toast.error(res.error);
  };
  const onRoleChange = async (uid: string, r: "admin" | "super_admin") => {
    const res = await safeCall(() => changeAdminRole({ data: { user_id: uid, role: r } }));
    if (res?.ok) { toast.success("Role updated"); refresh(); }
    else if (res && !res.ok) toast.error(res.error);
  };
  const onRemove = async (uid: string) => {
    const res = await safeCall(() => removeAdmin({ data: { user_id: uid } }));
    if (res?.ok) { toast.success("Removed"); refresh(); }
    else if (res && !res.ok) toast.error(res.error);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">Manage Admins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Teachers sign up at the admin login page. Super admins approve or reject requests.
        </p>
      </header>

      {!isSuper && (
        <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Shield className="mr-1 inline h-4 w-4" />
          Read-only mode. Only super admins can approve, change roles, or remove admins.
        </div>
      )}

      {/* Pending approvals */}
      <section className="mb-8">
        <h2 className="mb-3 font-serif text-xl font-semibold">
          Pending approvals {pending.length > 0 && <Badge className="ml-2">{pending.length}</Badge>}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {isLoading ? (
            <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : pending.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">No pending requests.</div>
          ) : (
            <div className="divide-y divide-border">
              {pending.map((a) => (
                <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                  <Avatar name={a.display_name || a.email} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium">{a.display_name || a.email}</div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{a.email}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Requested {format(new Date(a.created_at), "d MMM yyyy")}
                    </div>
                  </div>
                  {isSuper && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onApprove(a.id)} className="bg-primary text-primary-foreground">
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject this request?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {a.email}'s account will be deleted. They can sign up again later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onReject(a.id)}>Reject</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Active admins */}
      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Active admins</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : admins.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">No admins yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {admins.map((a) => (
                <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                  <Avatar name={a.display_name || a.email} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="truncate font-medium">{a.display_name || a.email}</div>
                      {a.role === "super_admin" ? (
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary">Super Admin</Badge>
                      ) : (
                        <Badge variant="outline">Admin</Badge>
                      )}
                      {a.id === user?.id && <Badge variant="secondary">You</Badge>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{a.email}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Added {format(new Date(a.created_at), "d MMM yyyy")}
                      {a.last_sign_in_at && ` · Last sign in ${format(new Date(a.last_sign_in_at), "d MMM yyyy")}`}
                    </div>
                  </div>
                  {isSuper && a.id !== user?.id && (
                    <div className="flex flex-wrap gap-2">
                      <Select value={a.role === "pending_admin" ? "admin" : a.role} onValueChange={(v: "admin" | "super_admin") => onRoleChange(a.id, v)}>
                        <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <ResetPasswordDialog adminId={a.id} adminEmail={a.email ?? ""} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove admin?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This deletes {a.email}'s account permanently.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onRemove(a.id)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/30 font-medium uppercase text-foreground">
      {(name || "?").charAt(0)}
    </div>
  );
}

function ResetPasswordDialog({ adminId, adminEmail }: { adminId: string; adminEmail: string }) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    setSubmitting(true);
    try {
      const res = await resetAdminPassword({ data: { user_id: adminId, password: pwd } });
      if (!res.ok) return toast.error(res.error);
      toast.success("Password reset");
      setPwd(""); setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new password for {adminEmail}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Label htmlFor="np">New password</Label>
          <Input id="np" type="text" minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="At least 8 characters" />
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
