import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserPlus, Trash2, Shield } from "lucide-react";
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
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { createAdmin, listAdmins, changeAdminRole, removeAdmin } from "@/server/admins.functions";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/admins")({
  component: ManageAdmins,
});

type Admin = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  role: "super_admin" | "admin";
  last_sign_in_at: string | null;
};

function ManageAdmins() {
  const { role, user } = useAuth();
  const isSuper = role === "super_admin";
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await listAdmins();
    if (res.ok) setAdmins(res.admins as Admin[]);
    else toast.error(res.error);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await inviteAdmin({ data: { email, role: newRole } });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(res.message ?? "Invitation sent");
      setEmail("");
      load();
    } finally { setInviting(false); }
  };

  const handleRoleChange = async (uid: string, r: "admin" | "super_admin") => {
    const res = await changeAdminRole({ data: { user_id: uid, role: r } });
    if (!res.ok) toast.error(res.error);
    else { toast.success("Role updated"); load(); }
  };

  const handleRemove = async (uid: string) => {
    const res = await removeAdmin({ data: { user_id: uid } });
    if (!res.ok) toast.error(res.error);
    else { toast.success("Admin removed"); load(); }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">Manage Admins</h1>
      </header>

      {!isSuper && (
        <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Shield className="mr-1 inline h-4 w-4" />
          You're viewing in read-only mode. Only super admins can add or remove admins.
        </div>
      )}

      {isSuper && (
        <form
          onSubmit={handleInvite}
          className="mb-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-end sm:p-6"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="email">Invite by email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@kvsrodelhi.in"
            />
          </div>
          <div className="space-y-1.5 sm:w-44">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={(v: "admin" | "super_admin") => setNewRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={inviting} className="bg-primary text-primary-foreground hover:opacity-90">
            {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Invite
          </Button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No admins yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {admins.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/30 font-medium uppercase text-foreground">
                  {(a.display_name || a.email || "?").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
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
                    <Select value={a.role} onValueChange={(v: "admin" | "super_admin") => handleRoleChange(a.id, v)}>
                      <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove admin?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This deletes {a.email}'s account permanently. They will lose access immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemove(a.id)}>Remove</AlertDialogAction>
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
    </div>
  );
}
