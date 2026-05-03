import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Role = "super_admin" | "admin" | "pending_admin";

async function log(
  actorId: string | null,
  actorEmail: string | null,
  action: string,
  target?: string | null,
  details?: any,
) {
  try {
    await supabaseAdmin.from("activity_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action,
      target: target ?? null,
      details: details ?? null,
    });
  } catch {
    /* best-effort */
  }
}

async function isCallerSuper(userClient: any, userId: string) {
  const { data } = await userClient.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: any) => r.role === "super_admin");
}

async function isCallerAdmin(userClient: any, userId: string) {
  const { data } = await userClient.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: any) => r.role === "admin" || r.role === "super_admin");
}

function fail(code: string, error: string) {
  return { ok: false as const, code, error };
}

// ───────────────────────── Stats (single source of truth) ─────────────────────────

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabase: userClient, userId } = context;
      if (!(await isCallerAdmin(userClient, userId))) {
        return fail("forbidden", "Forbidden");
      }

      const [arrCount, activeArr, roles] = await Promise.all([
        supabaseAdmin.from("arrangements").select("*", { count: "exact", head: true }),
        supabaseAdmin
          .from("arrangements")
          .select("title, arrangement_date")
          .eq("is_active", true)
          .maybeSingle(),
        supabaseAdmin.from("user_roles").select("user_id, role"),
      ]);

      const adminCount = new Set(
        (roles.data ?? [])
          .filter((r) => r.role === "admin" || r.role === "super_admin")
          .map((r) => r.user_id),
      ).size;
      const pendingCount = new Set(
        (roles.data ?? []).filter((r) => r.role === "pending_admin").map((r) => r.user_id),
      ).size;

      return {
        ok: true as const,
        totalArrangements: arrCount.count ?? 0,
        activeArrangement: activeArr.data
          ? { title: activeArr.data.title, date: activeArr.data.arrangement_date }
          : null,
        adminCount,
        pendingCount,
      };
    } catch (e: any) {
      console.error("getAdminStats failed", e);
      return fail("server_error", e?.message ?? "Failed to load stats");
    }
  });

// ───────────────────────── List admins (active + pending) ─────────────────────────

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabase: userClient, userId } = context;
      if (!(await isCallerAdmin(userClient, userId))) {
        return { ok: false as const, error: "Forbidden", admins: [], pending: [] };
      }

      const [profilesRes, rolesRes, usersRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("id, display_name, email, created_at"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.auth.admin.listUsers(),
      ]);

      const lastSignIn = new Map(
        (usersRes.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]),
      );

      const roleByUser = new Map<string, Role>();
      (rolesRes.data ?? []).forEach((r) => {
        const cur = roleByUser.get(r.user_id);
        // priority: super_admin > admin > pending_admin
        if (r.role === "super_admin") roleByUser.set(r.user_id, "super_admin");
        else if (r.role === "admin" && cur !== "super_admin") roleByUser.set(r.user_id, "admin");
        else if (!cur) roleByUser.set(r.user_id, r.role as Role);
      });

      const admins: any[] = [];
      const pending: any[] = [];
      (profilesRes.data ?? []).forEach((p) => {
        const r = roleByUser.get(p.id);
        if (!r) return;
        const row = {
          id: p.id,
          display_name: p.display_name,
          email: p.email,
          created_at: p.created_at,
          role: r,
          last_sign_in_at: lastSignIn.get(p.id) ?? null,
        };
        if (r === "pending_admin") pending.push(row);
        else admins.push(row);
      });

      return { ok: true as const, admins, pending };
    } catch (e: any) {
      console.error("listAdmins failed", e);
      return {
        ok: false as const,
        error: e?.message ?? "Failed to load admins",
        admins: [],
        pending: [],
      };
    }
  });

// ───────────────────────── Approve / Reject ─────────────────────────

const UidSchema = z.object({ user_id: z.string().uuid() });

export const approveAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UidSchema.parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { supabase: userClient, userId, claims } = context;
      if (!(await isCallerSuper(userClient, userId))) {
        return fail("forbidden", "Only super admins can approve.");
      }
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: "admin" });
      if (error) return fail("db_error", error.message);
      await log(userId, (claims as any)?.email ?? null, "admin.approved", data.user_id);
      return { ok: true as const };
    } catch (e: any) {
      console.error("approveAdmin failed", e);
      return fail("server_error", e?.message ?? "Failed to approve");
    }
  });

export const rejectAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UidSchema.parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { supabase: userClient, userId, claims } = context;
      if (!(await isCallerSuper(userClient, userId))) {
        return fail("forbidden", "Only super admins can reject.");
      }
      const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
      const targetEmail = target?.user?.email ?? null;
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
      if (error) return fail("db_error", error.message);
      await log(userId, (claims as any)?.email ?? null, "admin.rejected", targetEmail);
      return { ok: true as const };
    } catch (e: any) {
      console.error("rejectAdmin failed", e);
      return fail("server_error", e?.message ?? "Failed to reject");
    }
  });

// ───────────────────────── Change role / Remove / Reset password ─────────────────────────

const ChangeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "super_admin"]),
});

export const changeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChangeRoleSchema.parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { supabase: userClient, userId, claims } = context;
      if (!(await isCallerSuper(userClient, userId))) {
        return fail("forbidden", "Only super admins can change roles.");
      }
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role });
      if (error) return fail("db_error", error.message);
      await log(userId, (claims as any)?.email ?? null, "admin.role_changed", data.user_id, {
        role: data.role,
      });
      return { ok: true as const };
    } catch (e: any) {
      console.error("changeAdminRole failed", e);
      return fail("server_error", e?.message ?? "Failed to update role");
    }
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UidSchema.parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { supabase: userClient, userId, claims } = context;
      if (data.user_id === userId) return fail("self", "You cannot remove yourself.");
      if (!(await isCallerSuper(userClient, userId))) {
        return fail("forbidden", "Only super admins can remove admins.");
      }
      const { data: supers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");
      const isTargetSuper = (supers ?? []).some((r) => r.user_id === data.user_id);
      if (isTargetSuper && (supers?.length ?? 0) <= 1) {
        return fail("last_super", "Cannot remove the last super admin.");
      }
      const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
      const targetEmail = target?.user?.email ?? null;
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
      if (error) return fail("db_error", error.message);
      await log(userId, (claims as any)?.email ?? null, "admin.removed", targetEmail);
      return { ok: true as const };
    } catch (e: any) {
      console.error("removeAdmin failed", e);
      return fail("server_error", e?.message ?? "Failed to remove");
    }
  });

const ResetPwdSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(128),
});

export const resetAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResetPwdSchema.parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { supabase: userClient, userId, claims } = context;
      if (!(await isCallerSuper(userClient, userId))) {
        return fail("forbidden", "Only super admins can reset passwords.");
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password: data.password,
        email_confirm: true,
      });
      if (error) return fail("db_error", error.message);
      await log(userId, (claims as any)?.email ?? null, "admin.password_reset", data.user_id);
      return { ok: true as const };
    } catch (e: any) {
      console.error("resetAdminPassword failed", e);
      return fail("server_error", e?.message ?? "Failed to reset password");
    }
  });
