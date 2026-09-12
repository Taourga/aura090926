"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { roleLabels } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";
import { FacilitySwitcher } from "@/components/facility-switcher";

type NavItem = { href: string; label: string; feature?: string; roles?: Profile["role"][]; hiddenFor?: Profile["role"][] };

const navItems: NavItem[] = [
  { href: "/portal", label: "Vue d'ensemble" },
  { href: "/portal/housekeeping", label: "Hôtellerie & ménage", feature: "housekeeping", roles: ["governance", "technical", "admin"] },
  { href: "/portal/stays", label: "Entrées & sorties", roles: ["reception", "nurse", "admin"] },
  { href: "/portal/patients", label: "Patients", roles: ["doctor"] },
  { href: "/portal/permissions", label: "Permissions", feature: "permissions", hiddenFor: ["technical", "governance"] },
  { href: "/portal/activities", label: "Activités", feature: "activities", hiddenFor: ["doctor", "technical"] },
  { href: "/portal/appointments", label: "Planning", roles: ["patient", "doctor", "manager", "psychologist", "nurse", "provider"] },
  { href: "/portal/messages", label: "Messagerie", feature: "messaging", roles: ["doctor", "nurse"] },
  { href: "/portal/visits", label: "Visites", feature: "visits", roles: ["patient", "reception"] },
  { href: "/portal/menus", label: "Menus", feature: "menus", hiddenFor: ["doctor"] },
  { href: "/portal/information", label: "Informations", feature: "information", hiddenFor: ["doctor"] },
  { href: "/portal/admin", label: "Administration", roles: ["admin"] },
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
    {navItems.filter((item) => featureEnabled(profile, item.feature) && (!item.roles || item.roles.includes(profile.role)) && !item.hiddenFor?.includes(profile.role)).map((item) => (
      <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>{item.label}</Link>
    ))}
  </nav>;
}

export function PortalShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const initials = profile.full_name.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
  const stayDetails = profile.activeStay ? `Chambre ${profile.activeStay.room_number || "—"} · Entrée le ${new Intl.DateTimeFormat(profile.facility.locale || "fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(profile.activeStay.started_at))}` : null;
  const routeFeature = routeFeatures[pathname];
  const disabled = routeFeature && !featureEnabled(profile, routeFeature);
  const packLabel = profile.facility.countryPackCode === "AURA_FR" ? "FR" : profile.facility.countryPackCode === "AURA_DZ" ? "DZ" : "CORE";

  return <div className="portal">
    <aside className="sidebar">
      <Link href="/portal" className="brand"><span className="brand-mark">A</span>AURA</Link>
      <Navigation profile={profile} />
      <div className="sidebar-footer">{profile.facility.name}<br />AURA {packLabel} · Accès sécurisé</div>
    </aside>
    <div className="portal-main">
      <header className="portal-header">
        <div><div className="role-chip">{roleLabels[profile.role]} · {packLabel}</div><FacilitySwitcher facilities={profile.facilities} /></div>
        <div className="account"><div className="avatar" aria-hidden="true">{initials || "A"}</div><div><strong>{profile.full_name}</strong>{stayDetails && <span className="account-stay">{stayDetails}</span>}<br /><LogoutButton /></div></div>
      </header>
      <main className="content">{disabled ? <section className="card"><div className="card-body"><h1>Module désactivé</h1><p className="empty">Ce module n’est pas activé pour {profile.facility.name}. Sa disponibilité dépend de la configuration de l’établissement.</p></div></section> : children}</main>
      <Navigation profile={profile} mobile />
    </div>
  </div>;
}
