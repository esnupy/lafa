"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const LoginForm = () => {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const error = searchParams.get("error");

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-[100px] w-[100px] items-center justify-center">
            <Image
              src={mounted && theme === "dark" ? "/lafa-logo-dark.png" : "/lafa-logo.webp"}
              alt="LAFA"
              width={mounted && theme === "dark" ? 100 : 80}
              height={mounted && theme === "dark" ? 100 : 80}
              className="object-contain"
            />
          </div>
          <CardDescription>
            Inicia sesion para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@correo.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full">
              Iniciar sesion
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
