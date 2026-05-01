import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InviteSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(["admin", "super_admin"]),
});

export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InviteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId } = context;

    // Verify caller is super_admin
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) {
      return { ok: false as const, error: "Only super admins can invite admins." };
    }

    // Invite via admin API (sends email)
    const origin = process.env.SITE_URL || "";
    const { data: invited, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      origin ? { redirectTo: `${origin}/reset-password` } : undefined,
    );
    if (invErr || !invited?.user) {
      // Fallback: try to find existing user
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!existing) {
        return { ok: false as const, error: invErr?.message ?? "Could not invite user." };
      }
      // Just (re)assign role below
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: existing.id, role: data.role },
        { onConflict: "user_id,role" },
      );
      return { ok: true as const, message: "User already existed — role updated." };
    }

    // Trigger created an admin row by default; if super_admin requested, add it
    if (data.role === "super_admin") {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: invited.user.id, role: "super_admin" },
        { onConflict: "user_id,role" },
      );
    }

    return { ok: true as const, message: "Invitation sent." };
  });

const ChangeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "super_admin"]),
});

export const changeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChangeRoleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId } = context;
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) return { ok: false as const, error: "Only super admins can change roles." };

    // Wipe target's roles, set the new one
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

const RemoveSchema = z.object({ user_id: z.string().uuid() });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RemoveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId } = context;
    if (data.user_id === userId) {
      return { ok: false as const, error: "You cannot remove yourself." };
    }
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) return { ok: false as const, error: "Only super admins can remove admins." };

    // Ensure at least one super_admin remains
    const { data: supers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    const isTargetSuper = (supers ?? []).some((r) => r.user_id === data.user_id);
    if (isTargetSuper && (supers?.length ?? 0) <= 1) {
      return { ok: false as const, error: "Cannot remove the last super admin." };
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: userClient, userId } = context;
    const { data: callerRoles } = await userClient.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (callerRoles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return { ok: false as const, error: "Forbidden", admins: [] };

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email, created_at");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
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
