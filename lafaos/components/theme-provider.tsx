"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Envuelve la app con next-themes para habilitar cambio entre light/dark.
 * Usa `class` como attribute para aplicar .dark al <html>.
 */
export const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" {...props}>
      {children}
    </NextThemesProvider>
  );
};
