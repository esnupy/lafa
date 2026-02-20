import Link from "next/link";

/**
 * Pagina 404 personalizada.
 * Mejora el manejo de rutas inexistentes en Vercel (issue Next.js #60477).
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">404 - Página no encontrada</h1>
      <Link href="/" className="text-primary underline">
        Volver al inicio
      </Link>
    </div>
  );
}
