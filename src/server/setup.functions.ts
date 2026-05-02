import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Returns true ONLY if the backend has zero users AND zero roles.
 * Used by the login page to decide between "Create Super Admin" and "Sign In".
 * Source of truth = backend (service role), not browser/RLS.
 */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const [{ count: roleCount }, { data: usersRes }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
  ]);
  const userCount = usersRes?.users?.length ?? 0;
  const setupRequired = (roleCount ?? 0) === 0 && userCount === 0;
  return { setupRequired };
});

const BootstrapSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  display_name: z.string().trim().max(80).optional(),
});

/**
 * Server-controlled first-admin creation. Will refuse to run if any
 * user/role already exists. Creates the first auth user (the
 * handle_new_user trigger then assigns super_admin since user_roles is empty).
 */
export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => BootstrapSchema.parse(d))
  .handler(async ({ data }) => {
    const [{ count: roleCount }, { data: usersRes }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ]);
    if ((roleCount ?? 0) > 0 || (usersRes?.users?.length ?? 0) > 0) {
      return {
        ok: false as const,
        code: "setup_closed" as const,
        error: "An admin already exists. Please sign in instead.",
      };
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name || data.email.split("@")[0] },
    });

    if (createErr || !created?.user?.id) {
      return {
        ok: false as const,
        code: "create_failed" as const,
        error: createErr?.message ?? "Could not create the super admin account.",
      };
    }

    // The handle_new_user trigger inserts the profile and role.
    // Belt-and-suspenders: ensure a super_admin role row exists.
    const uid = created.user.id;
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", uid)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "super_admin" });
    }

    await supabaseAdmin.from("activity_logs").insert({
      actor_id: uid,
      actor_email: data.email,
      action: "setup.super_admin_created",
      target: data.email,
    });

    return { ok: true as const };
  });
