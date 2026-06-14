import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "PM1 — Primer Movimiento",
  description: "Sistema de intervención conductual. Transforma evitación en acción real.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
