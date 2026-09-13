"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { roleLabels } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";
import { FacilitySwitcher } from "@/components/facility-switcher";
import { MessageBell } from "@/components/message-bell";

type NavItem = { href: string; label: string; icon: string; feature?: string; roles?: Profile["role"][]; hiddenFor?: Profile["role"][] };

const navItems: NavItem[] = [
  { href: "/portal", label: "Accueil", icon: "⌂" },
  { href: "/portal/pulse", label: "AURA Pulse", icon: "⌁", roles: ["doctor", "manager", "nurse", "reception", "admin", "governance", "technical"] },
  { href: "/portal/handoff", label: "Relève", icon: "↻", roles: ["nurse"] },
  { href: "/portal/roi", label: "Pilotage ROI", icon: "↗", roles: ["admin"] },
  { href: "/portal/stays", label: "Séjours", icon: "▦", roles: ["reception", "nurse", "doctor", "admin"] },
  { href: "/portal/discharges", label: "Sorties", icon: "⇥", roles: ["doctor", "manager", "nurse", "reception", "admin", "governance", "technical"] },
  { href: "/portal/patients", label: "Mes patients", icon: "◎", roles: ["doctor"] },
  { href: "/portal/doctor-availability", label: "Mes absences", icon: "◌", roles: ["doctor"] },
  { href: "/portal/permissions", label: "Permissions", icon: "✓", feature: "permissions", hiddenFor: ["technical", "governance", "trusted_contact"] },
  { href: "/portal/appointments", label: "Planning", icon: "◷", roles: ["patient", "doctor", "manager", "psychologist", "nurse", "provider"] },
  { href: "/portal/activities", label: "Activités", icon: "✦", feature: "activities", hiddenFor: ["doctor", "technical", "trusted_contact", "reception"] },
  { href: "/portal/visits", label: "Visites", icon: "♧", feature: "visits", roles: ["patient", "reception"] },
  { href: "/portal/messages", label: "Messages", icon: "✉", feature: "messaging", roles: ["patient", "doctor", "nurse", "manager", "governance"] },
  { href: "/portal/contacts", label: "Mes contacts", icon: "♡", roles: ["patient"] },
  { href: "/portal/menus", label: "Menus", icon: "≡", feature: "menus", hiddenFor: ["doctor", "trusted_contact", "reception"] },
  { href: "/portal/information", label: "Infos pratiques", icon: "i", feature: "information", hiddenFor: ["doctor", "trusted_contact"] },
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
};

const routeLabels: Array<[string, string]> = [
  ["/portal/doctor-availability", "Mes absences"],
  ["/portal/appointments", "Planning"],
  ["/portal/permissions", "Permissions"],
  ["/portal/activities", "Activités"],
  ["/portal/messages", "Messages"],
  ["/portal/contacts", "Mes contacts"],
  ["/portal/information", "Infos pratiques"],
  ["/portal/housekeeping", "Hôtellerie"],
  ["/portal/discharges", "Sorties"],
  ["/portal/patients", "Mes patients"],
  ["/portal/stays", "Séjours"],
  ["/portal/visits", "Visites"],
  ["/portal/menus", "Menus"],
  ["/portal/pulse", "AURA Pulse"],
  ["/portal/handoff", "Relève"],
  ["/portal/roi", "Pilotage ROI"],
  ["/portal/admin", "Réglages"],
  ["/portal/proche", "Mon proche"],
];

function featureEnabled(profile: Profile, feature?: string) { if (!feature) return true; return profile.facilityConfig[`features.${feature}`] !== false; }

function Navigation({ profile, mobile = false }: { profile: Profile; mobile?: boolean }) {
  const pathname = usePathname();
  const items = profile.role === "trusted_contact" ? [{ href: "/portal/proche", label: "Mon proche", icon: "♡" } satisfies NavItem] : navItems;
  return <nav className={mobile ? "mobile-nav" : "nav"} aria-label="Navigation principale">
    {items.filter((item) => featureEnabled(profile, item.feature) && (!item.roles || item.roles.includes(profile.role)) && !item.hiddenFor?.includes(profile.role)).map((item) => {
      const active = item.href === "/portal" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
      return <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} title={item.label}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span className="nav-label">{item.label}</span></Link>;
    })}
  </nav>;
}

export function PortalShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const initials = profile.full_name.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
  const stayDetails = profile.activeStay ? `Chambre ${profile.activeStay.room_number || "—"} · Entrée le ${new Intl.DateTimeFormat(profile.facility.locale || "fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: profile.facility.timezone }).format(new Date(profile.activeStay.started_at))}` : null;
  const routeFeature = Object.entries(routeFeatures).find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1];
  const disabled = routeFeature && !featureEnabled(profile, routeFeature);
  const packLabel = profile.facility.countryPackCode === "AURA_FR" ? "FR" : profile.facility.countryPackCode === "AURA_DZ" ? "DZ" : "CORE";
  const isDemo = profile.facilityConfig.demo === true;
  const showMessageBell = ["patient", "doctor", "nurse", "manager", "governance"].includes(profile.role);
  const currentSection = pathname === "/portal" ? "Accueil" : routeLabels.find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] || "AURA";
  const helpHref = profile.role === "admin" ? "/portal/admin" : profile.role === "trusted_contact" ? "/portal/proche" : featureEnabled(profile, "information") && profile.role !== "doctor" ? "/portal/information" : "/portal";
  const helpLabel = profile.role === "admin" ? "Configurer" : helpHref === "/portal/information" ? "Aide & infos" : "Retour accueil";

  return <div className="portal">
    <a className="skip-link" href="#main-content">Aller au contenu</a>
    <aside className="sidebar">
      <Link href={profile.role === "trusted_contact" ? "/portal/proche" : "/portal"} className="brand" aria-label="Accueil AURA"><span className="brand-mark">A</span><span>AURA</span></Link>
      <Navigation profile={profile} />
      <div className="sidebar-footer"><strong>{profile.facility.name}</strong><br />AURA {packLabel} · Accès sécurisé</div>
    </aside>
    <div className="portal-main">
      <header className="portal-header">
        <div className="portal-context">
          <div className="portal-context-copy"><span className="portal-eyebrow">{roleLabels[profile.role]}</span><strong className="portal-section-title">{currentSection}</strong></div>
          <div className="role-chip">{packLabel}</div>
          {isDemo && <span className="demo-chip">Données fictives</span>}
          <FacilitySwitcher facilities={profile.facilities} />
        </div>
        <div className="portal-header-actions">
          <Link className="header-help-link" href={helpHref}>{helpLabel}</Link>
          {showMessageBell && <MessageBell />}
          <div className="account"><div className="avatar" aria-hidden="true">{initials || "A"}</div><div><strong>{profile.full_name}</strong>{stayDetails && <span className="account-stay">{stayDetails}</span>}<br /><LogoutButton /></div></div>
        </div>
      </header>
      <main id="main-content" className="content" tabIndex={-1}>{disabled ? <section className="card"><div className="card-body"><h1>Module non activé</h1><p className="empty">Cette fonction n’est pas utilisée par {profile.facility.name}. L’administrateur peut l’activer dans les réglages de l’établissement.</p>{profile.role === "admin" && <Link href="/portal/admin" className="button button-primary">Ouvrir les réglages</Link>}</div></section> : children}</main>
      <Navigation profile={profile} mobile />
    </div>
  </div>;
}
