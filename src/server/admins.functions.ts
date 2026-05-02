import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function log(
  actorId: string,
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
    // best-effort
  }
}

const CreateSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  display_name: z.string().trim().max(80).optional(),
  role: z.enum(["admin", "super_admin"]),
});

export const createAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId, claims } = context;

    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) {
      return { ok: false as const, error: "Only super admins can create admins." };
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name || data.email.split("@")[0] },
    });

    let targetUserId = created?.user?.id;

    if (createErr || !targetUserId) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!existing) {
        return { ok: false as const, error: createErr?.message ?? "Could not create user." };
      }
      targetUserId = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: data.password,
        email_confirm: true,
      });
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: targetUserId, role: data.role });
    if (roleErr) return { ok: false as const, error: roleErr.message };

    await log(userId, (claims as any)?.email ?? null, "admin.created", data.email, {
      role: data.role,
    });

    return { ok: true as const, message: "Admin account created." };
  });

const ResetPwdSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(128),
});

export const resetAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResetPwdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId, claims } = context;
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) return { ok: false as const, error: "Only super admins can reset passwords." };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
      email_confirm: true,
    });
    if (error) return { ok: false as const, error: error.message };

    await log(userId, (claims as any)?.email ?? null, "admin.password_reset", data.user_id);
    return { ok: true as const };
  });

const ChangeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "super_admin"]),
});

export const changeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChangeRoleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId, claims } = context;
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) return { ok: false as const, error: "Only super admins can change roles." };

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) return { ok: false as const, error: error.message };

    await log(userId, (claims as any)?.email ?? null, "admin.role_changed", data.user_id, {
      role: data.role,
    });
    return { ok: true as const };
  });

const RemoveSchema = z.object({ user_id: z.string().uuid() });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RemoveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId, claims } = context;
    if (data.user_id === userId) {
      return { ok: false as const, error: "You cannot remove yourself." };
    }
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) return { ok: false as const, error: "Only super admins can remove admins." };

    const { data: supers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    const isTargetSuper = (supers ?? []).some((r) => r.user_id === data.user_id);
    if (isTargetSuper && (supers?.length ?? 0) <= 1) {
      return { ok: false as const, error: "Cannot remove the last super admin." };
    }

    // Capture email before delete for the log
    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    const targetEmail = target?.user?.email ?? null;

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) return { ok: false as const, error: error.message };

    await log(userId, (claims as any)?.email ?? null, "admin.removed", targetEmail);
    return { ok: true as const };
  });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: userClient, userId } = context;
    const { data: callerRoles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (callerRoles ?? []).some(
      (r) => r.role === "admin" || r.role === "super_admin",
    );
    if (!isAdmin) return { ok: false as const, error: "Forbidden", admins: [] };

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email, created_at");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: usersRes } = await supabaseAdmin.auth.admin.listUsers();
    const lastSignIn = new Map(
      (usersRes?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]),
    );
    const roleByUser = new Map<string, "super_admin" | "admin">();
    (roles ?? []).forEach((r) => {
      const cur = roleByUser.get(r.user_id);
      if (r.role === "super_admin" || !cur) roleByUser.set(r.user_id, r.role);
    });

    const admins = (profiles ?? [])
      .filter((p) => roleByUser.has(p.id))
      .map((p) => ({
        id: p.id,
        display_name: p.display_name,
        email: p.email,
        created_at: p.created_at,
        role: roleByUser.get(p.id)!,
        last_sign_in_at: lastSignIn.get(p.id) ?? null,
      }));

    return { ok: true as const, admins };
  });
