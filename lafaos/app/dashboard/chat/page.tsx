import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatClient } from "./chat-client";

/**
 * Pagina del asistente AI (admin y supervisor).
 * Chat widget que consulta a Claude con contexto operativo real.
 */
const ChatPage = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || !["admin", "supervisor"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asistente AI</h1>
        <p className="text-muted-foreground">
          Pregunta sobre la operacion en lenguaje natural
        </p>
      </div>

      <ChatClient />
    </div>
  );
};

export default ChatPage;
