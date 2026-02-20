import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./sidebar";

export type UserProfile = {
  id: string;
  user_id: string;
  name: string;
  role: "admin" | "supervisor";
  email: string;
};

/**
 * Layout protegido del dashboard.
 * Verifica sesion activa y obtiene perfil con rol del usuario.
 * Redirige a /login si no hay sesion.
 */
const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, user_id, name, role")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const userProfile: UserProfile = {
    ...profile,
    role: profile.role as "admin" | "supervisor",
    email: user.email ?? "",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar profile={userProfile} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
};

export default DashboardLayout;
