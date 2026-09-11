"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { roleLabels } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";

type NavItem = { href: string; label: string; roles?: Profile["role"][]; hiddenFor?: Profile["role"][] };

const navItems: NavItem[] = [
  { href: "/portal", label: "Vue d'ensemble" },
  { href: "/portal/housekeeping", label: "Hôtellerie & ménage", roles: ["governance", "technical", "admin"] },
  { href: "/portal/stays", label: "Entrées & sorties", roles: ["reception", "nurse", "admin"] },
  { href: "/portal/patients", label: "Patients", roles: ["doctor"] },
  { href: "/portal/permissions", label: "Permissions", hiddenFor: ["technical", "governance"] },
  { href: "/portal/activities", label: "Activités", hiddenFor: ["doctor", "technical"] },
  { href: "/portal/appointments", label: "Planning", roles: ["patient", "doctor", "manager", "psychologist", "nurse", "provider"] },
  { href: "/portal/visits", label: "Visites", roles: ["patient", "reception"] },
  { href: "/portal/menus", label: "Menus", hiddenFor: ["doctor"] },
  { href: "/portal/information", label: "Informations", hiddenFor: ["doctor"] },
  { href: "/portal/admin", label: "Administration", roles: ["admin"] },
];

function Navigation({ profile, mobile = false }: { profile: Profile; mobile?: boolean }) {
  const pathname = usePathname();
  return <nav className={mobile ? "mobile-nav" : "nav"} aria-label="Navigation principale">
    {navItems.filter((item) => (!item.roles || item.roles.includes(profile.role)) && !item.hiddenFor?.includes(profile.role)).map((item) => (
      <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>{item.label}</Link>
    ))}
  </nav>;
}

export function PortalShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const initials = profile.full_name.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
  const stayDetails = profile.activeStay ? `Chambre ${profile.activeStay.room_number || "—"} · Entrée le ${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(profile.activeStay.started_at))}` : null;
  return <div className="portal">
    <aside className="sidebar">
      <Link href="/portal" className="brand"><span className="brand-mark">A</span>AURA</Link>
      <Navigation profile={profile} />
      <div className="sidebar-footer">Portail de séjour<br />Accès sécurisé</div>
    </aside>
    <div className="portal-main">
      <header className="portal-header">
        <div><div className="role-chip">{roleLabels[profile.role]}</div><p>Clinique privée</p></div>
        <div className="account"><div className="avatar" aria-hidden="true">{initials || "A"}</div><div><strong>{profile.full_name}</strong>{stayDetails && <span className="account-stay">{stayDetails}</span>}<br /><LogoutButton /></div></div>
      </header>
      <main className="content">{children}</main>
      <Navigation profile={profile} mobile />
    </div>
  </div>;
}
