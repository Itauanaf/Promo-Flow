"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, ChevronDown, CircleDollarSign, LayoutDashboard, Menu, Radio, Send, Settings, Tags, Users, X } from "lucide-react";
import { useState } from "react";

const nav = [
  ["/dashboard", "Visão geral", LayoutDashboard], ["/ofertas", "Ofertas", Tags], ["/automacoes", "Automações", Bot],
  ["/publicacoes", "Publicações", Send], ["/grupos", "Grupos", Users], ["/afiliados", "Afiliados", CircleDollarSign],
  ["/relatorios", "Relatórios", BarChart3], ["/configuracoes", "Configurações", Settings],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false);
  return <div className="shell">
    <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Abrir menu">{open ? <X /> : <Menu />}</button>
    <aside className={open ? "sidebar open" : "sidebar"}>
      <div className="brand"><span className="mark">P</span><span>PromoFlow</span></div>
      <nav aria-label="Navegação principal">{nav.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href ? "active" : ""}><Icon size={18} /><span>{label}</span></Link>)}</nav>
      <div className="sidebar-foot"><div className="status-dot" /><div><strong>Sistema em demonstração</strong><span>Nenhum envio real ativo</span></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div className="live"><Radio size={15} /><span>Operação pausada</span></div><button className="profile">IA<span className="profile-copy">Itauana<br/><small>Administrador</small></span><ChevronDown size={14}/></button></header>
      <div className="content">{children}</div>
    </main>
  </div>;
}
