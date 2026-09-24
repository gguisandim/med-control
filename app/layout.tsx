import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle de Medicamentos",
  description: "Registro familiar de administração de medicamentos por turno.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
