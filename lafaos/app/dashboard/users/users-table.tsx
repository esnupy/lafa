"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateUserRole } from "./actions";
import { Shield, ShieldCheck } from "lucide-react";

type Profile = {
  id: string;
  user_id: string;
  name: string;
  role: string;
  created_at: string;
};

type UsersTableProps = {
  profiles: Profile[];
  currentUserId: string;
};

export const UsersTable = ({ profiles, currentUserId }: UsersTableProps) => {
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRoleChange = (profileId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "supervisor" : "admin";
    setUpdatingId(profileId);
    startTransition(async () => {
      try {
        await updateUserRole(profileId, newRole as "admin" | "supervisor");
      } catch (err) {
        console.error("Error updating role:", err);
      } finally {
        setUpdatingId(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos los usuarios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Nombre</th>
                <th className="pb-3 pr-4 font-medium">Rol</th>
                <th className="pb-3 pr-4 font-medium">Fecha de registro</th>
                <th className="pb-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const isSelf = profile.user_id === currentUserId;
                const isUpdating = updatingId === profile.id && isPending;

                return (
                  <tr key={profile.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {profile.role === "admin" ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </div>
                        <span className="font-medium">
                          {profile.name || "Sin nombre"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                        {profile.role}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">Tu cuenta</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => handleRoleChange(profile.id, profile.role)}
                          aria-label={`Cambiar rol de ${profile.name}`}
                          tabIndex={0}
                        >
                          {isUpdating
                            ? "Actualizando..."
                            : `Cambiar a ${profile.role === "admin" ? "supervisor" : "admin"}`}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
