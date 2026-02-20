import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "./users-table";

/**
 * Panel de gestion de usuarios. Solo accesible por admins.
 * Lista todos los perfiles y permite cambiar roles.
 */
const UsersPage = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, name, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestiona los usuarios y sus roles en el sistema
        </p>
      </div>

      <UsersTable profiles={profiles ?? []} currentUserId={user.id} />
    </div>
  );
};

export default UsersPage;
