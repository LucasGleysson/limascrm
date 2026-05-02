import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is a gestor
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "gestor");

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, nome, cargo, unidade_padrao, unidades_ids } = payload;

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, cargo },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update profile with unidade_padrao if provided
      if (unidade_padrao) {
        await supabaseAdmin.from("profiles").update({ unidade_padrao }).eq("id", newUser.user.id);
      }

      // Sync agente_unidades for agents
      if (cargo === "agente" && Array.isArray(unidades_ids)) {
        const rows = unidades_ids
          .filter((u: string) => !!u)
          .map((id_unidade: string) => ({ id_agente: newUser.user.id, id_unidade }));
        if (rows.length > 0) {
          await supabaseAdmin.from("agente_unidades").insert(rows);
        }
      }

      return new Response(JSON.stringify({ user: newUser.user }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update") {
      const { user_id, nome, cargo, unidade_padrao, email, password, unidades_ids } = payload;

      // Update profile
      const profileUpdate: Record<string, unknown> = {};
      if (nome !== undefined) profileUpdate.nome = nome;
      if (cargo !== undefined) profileUpdate.cargo = cargo;
      if (unidade_padrao !== undefined) profileUpdate.unidade_padrao = unidade_padrao;
      if (email !== undefined) profileUpdate.email = email;

      if (Object.keys(profileUpdate).length > 0) {
        await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", user_id);
      }

      // Update role in user_roles
      if (cargo !== undefined) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
        await supabaseAdmin.from("user_roles").insert({ user_id, role: cargo });
      }

      // Sync agente_unidades when caller provided the list
      if (Array.isArray(unidades_ids)) {
        // Wipe existing links for this agent
        await supabaseAdmin.from("agente_unidades").delete().eq("id_agente", user_id);
        // If still an agent, insert the new list
        const isAgent = (cargo ?? (await supabaseAdmin.from("profiles").select("cargo").eq("id", user_id).single()).data?.cargo) === "agente";
        if (isAgent) {
          const rows = unidades_ids
            .filter((u: string) => !!u)
            .map((id_unidade: string) => ({ id_agente: user_id, id_unidade }));
          if (rows.length > 0) {
            await supabaseAdmin.from("agente_unidades").insert(rows);
          }
        }
      }

      // Update auth email/password if changed
      const authUpdate: Record<string, unknown> = {};
      if (email) authUpdate.email = email;
      if (password) authUpdate.password = password;
      if (Object.keys(authUpdate).length > 0) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list") {
      const [{ data: profiles }, { data: agentUnidades }] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: true }),
        supabaseAdmin.from("agente_unidades").select("id_agente, id_unidade"),
      ]);

      return new Response(JSON.stringify({ profiles: profiles || [], agente_unidades: agentUnidades || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const { user_id } = payload;
      await supabaseAdmin.auth.admin.deleteUser(user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
