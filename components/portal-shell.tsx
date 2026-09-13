"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { roleLabels } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";
import { FacilitySwitcher } from "@/components/facility-switcher";

type NavItem = { href: string; label: string; icon: string; feature?: string; roles?: Profile["role"][]; hiddenFor?: Profile["role"][] };

const navItems: NavItem[] = [
  { href: "/portal", label: "Accueil", icon: "⌂" },
  { href: "/portal/pulse", label: "AURA Pulse", icon: "⌁", roles: ["doctor", "manager", "nurse", "reception", "admin", "governance", "technical"] },
  { href: "/portal/stays", label: "Séjours", icon: "▦", roles: ["reception", "nurse", "doctor", "admin"] },
  { href: "/portal/discharges", label: "Sorties", icon: "⇥", roles: ["doctor", "manager", "nurse", "reception", "admin", "governance", "technical"] },
  { href: "/portal/patients", label: "Patients", icon: "◎", roles: ["doctor"] },
  { href: "/portal/permissions", label: "Permissions", icon: "✓", feature: "permissions", hiddenFor: ["technical", "governance"] },
  { href: "/portal/appointments", label: "Planning", icon: "◷", roles: ["patient", "doctor", "manager", "psychologist", "nurse", "provider"] },
  { href: "/portal/activities", label: "Activités", icon: "✦", feature: "activities", hiddenFor: ["doctor", "technical"] },
  { href: "/portal/visits", label: "Visites", icon: "♧", feature: "visits", roles: ["patient", "reception"] },
  { href: "/portal/messages", label: "Messages", icon: "✉", feature: "messaging", roles: ["doctor", "nurse", "manager", "governance"] },
  { href: "/portal/menus", label: "Menus", icon: "≡", feature: "menus", hiddenFor: ["doctor"] },
  { href: "/portal/information", label: "Infos", icon: "i", feature: "information", hiddenFor: ["doctor"] },
  { href: "/portal/housekeeping", label: "Hôtellerie", icon: "◇", feature: "housekeeping", roles: ["governance", "technical", "admin"] },
  { href: "/portal/admin", label: "Réglages", icon: "⚙", roles: ["admin"] },
];

const routeFeatures: Record<string, string> = {
  "/portal/housekeeping": "housekeeping",
  "/portal/permissions": "permissions",
  "/portal/activities": "activities",
  "/portal/messages": "messaging",
  "/portal/visits": "visits",
  "/portal/menus": "menus",
  "/portal/information": "information",
  "/portal/sport-room": "sport",
};

function featureEnabled(profile: Profile, feature?: string) {
  if (!feature) return true;
  return profile.facilityConfig[`features.${feature}`] !== false;
}

function Navigation({ profile, mobile = false }: { profile: Profile; mobile?: boolean }) {
  const pathname = usePathname();
  return <nav className={mobile ? "mobile-nav" : "nav"} aria-label="Navigation principale">
    {navItems.filter((item) => featureEnabled(profile, item.feature) && (!item.roles || item.roles.includes(profile.role)) && !item.hiddenFor?.includes(profile.role)).map((item) => {
      const active = item.href === "/portal" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
      return <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} title={item.label}>
        <span className="nav-icon" aria-hidden="true">{item.icon}</span><span className="nav-label">{item.label}</span>
      </Link>;
    })}
  </nav>;
}

export function PortalShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const initials = profile.full_name.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
  const stayDetails = profile.activeStay ? `Chambre ${profile.activeStay.room_number || "—"} · Entrée le ${new Intl.DateTimeFormat(profile.facility.locale || "fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: profile.facility.timezone }).format(new Date(profile.activeStay.started_at))}` : null;
  const routeFeature = routeFeatures[pathname];
  const disabled = routeFeature && !featureEnabled(profile, routeFeature);
  const packLabel = profile.facility.countryPackCode === "AURA_FR" ? "FR" : profile.facility.countryPackCode === "AURA_DZ" ? "DZ" : "CORE";
  const isDemo = profile.facilityConfig.demo === true;

  return <div className="portal">
    <aside className="sidebar">
      <Link href="/portal" className="brand"><span className="brand-mark">A</span><span>AURA</span></Link>
      <Navigation profile={profile} />
      <div className="sidebar-footer"><strong>{profile.facility.name}</strong><br />AURA {packLabel} · Accès sécurisé</div>
    </aside>
    <div className="portal-main">
      <header className="portal-header">
        <div className="portal-context"><div className="role-chip">{roleLabels[profile.role]} · {packLabel}</div>{isDemo && <span className="demo-chip">Données fictives</span>}<FacilitySwitcher facilities={profile.facilities} /></div>
        <div className="account"><div className="avatar" aria-hidden="true">{initials || "A"}</div><div><strong>{profile.full_name}</strong>{stayDetails && <span className="account-stay">{stayDetails}</span>}<br /><LogoutButton /></div></div>
      </header>
      <main className="content">{disabled ? <section className="card"><div className="card-body"><h1>Module non activé</h1><p className="empty">Cette fonction n’est pas utilisée par {profile.facility.name}. L’administrateur peut l’activer dans les réglages de l’établissement.</p></div></section> : children}</main>
      <Navigation profile={profile} mobile />
    </div>
  </div>;
}
