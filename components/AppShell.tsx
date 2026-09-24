"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, Clock3, LayoutDashboard, Settings, LogOut } from "lucide-react";

const nav = [
  { href: "/", label: "Hoje", icon: ClipboardCheck },
  { href: "/historico", label: "Histórico", icon: Clock3 },
  { href: "/resumo", label: "Resumo", icon: LayoutDashboard },
  { href: "/configuracoes", label: "Ajustes", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <main className="shell">
        <header className="topbar">
          <div>
            <div className="brand">Controle de medicamentos</div>
            <div className="subtle">Registro familiar por turno</div>
          </div>
          <button className="button button-outline" style={{ minHeight: 40, padding: "8px 10px" }} onClick={logout}>
            <LogOut size={17} aria-hidden />
            <span className="small">Sair deste dispositivo</span>
          </button>
        </header>
        {children}
      </main>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link href={href} className={`nav-item ${active ? "active" : ""}`} key={href}>
              <Icon className="nav-icon" aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
