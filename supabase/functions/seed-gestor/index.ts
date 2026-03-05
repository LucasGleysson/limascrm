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

    // Check if any users exist
    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      return new Response(
        JSON.stringify({ message: "Já existe pelo menos um usuário. Seed não necessário." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create seed gestor
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: "gestor@lima.com",
      password: "lima2025",
      email_confirm: true,
      user_metadata: { nome: "Gestor Lima", cargo: "gestor" },
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Gestor seed criado", email: "gestor@lima.com", password: "lima2025" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
