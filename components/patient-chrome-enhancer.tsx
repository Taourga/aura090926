"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Mounts = {
  dock: HTMLElement | null;
  services: HTMLElement | null;
};

const quickItems = [
  { href: "/portal/appointments", icon: "◷", label: "Planning", detail: "Mon calendrier" },
  { href: "/portal/activities", icon: "✦", label: "Activités", detail: "Mes activités" },
  { href: "/portal/visits", icon: "♧", label: "Visites", detail: "Ajouter une visite" },
  { href: "/portal/permissions", icon: "↗", label: "Permissions", detail: "Mes sorties" },
];

const serviceItems = [
  { href: "/portal/menus", icon: "☕", label: "Repas" },
  { href: "/portal/contacts", icon: "♡", label: "Mes contacts" },
  { href: "/portal/information", icon: "i", label: "Infos pratiques" },
];

function activeRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PatientChromeEnhancer() {
  const pathname = usePathname();
  const [mounts, setMounts] = useState<Mounts>({ dock: null, services: null });

  useEffect(() => {
    if (!pathname.startsWith("/portal")) return;
    let cancelled = false;
    let portal: HTMLElement | null = null;
    let dockRoot: HTMLElement | null = null;
    let servicesRoot: HTMLElement | null = null;

    fetch("/api/patient-dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return false;
        await response.json();
        return true;
      })
      .then((isPatient) => {
        if (cancelled || !isPatient) return;
        portal = document.querySelector<HTMLElement>(".portal");
        const main = document.querySelector<HTMLElement>(".portal-main");
        const header = document.querySelector<HTMLElement>(".portal-header");
        const content = document.querySelector<HTMLElement>("#main-content");
        if (!portal || !main || !header || !content) return;

        portal.classList.add("portal-patient-epure");

        dockRoot = document.createElement("div");
        dockRoot.className = "patient-quick-dock-mount";
        header.insertAdjacentElement("afterend", dockRoot);

        if (pathname === "/portal") {
          servicesRoot = document.createElement("div");
          servicesRoot.className = "patient-home-services-mount";
          content.insertAdjacentElement("afterbegin", servicesRoot);
        }

        setMounts({ dock: dockRoot, services: servicesRoot });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      portal?.classList.remove("portal-patient-epure");
      dockRoot?.remove();
      servicesRoot?.remove();
      setMounts({ dock: null, services: null });
    };
  }, [pathname]);

  const dock = mounts.dock ? createPortal(
    <nav className="patient-primary-dock" aria-label="Actions principales patient">
      {quickItems.map((item) => <Link key={item.href} href={item.href} className={activeRoute(pathname, item.href) ? "active" : ""}>
        <span className="patient-primary-icon" aria-hidden="true">{item.icon}</span>
        <span className="patient-primary-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
      </Link>)}
    </nav>,
    mounts.dock,
  ) : null;

  const services = mounts.services ? createPortal(
    <nav className="patient-home-services" aria-label="Services utiles">
      <span className="patient-home-services-title">À portée de main</span>
      {serviceItems.map((item) => <Link key={item.href} href={item.href}><b aria-hidden="true">{item.icon}</b><span>{item.label}</span></Link>)}
    </nav>,
    mounts.services,
  ) : null;

  return <>{dock}{services}</>;
}
