"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function InterventionNavEnhancer(){
  const pathname=usePathname();
  useEffect(()=>{
    if(!pathname.startsWith("/portal"))return;
    let cancelled=false;
    fetch("/api/prescriptions",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{
      if(cancelled||!data||!["provider","psychologist","coach"].includes(data.role))return;
      document.querySelectorAll<HTMLElement>(".nav, .mobile-nav").forEach(nav=>{
        if(nav.querySelector('[data-intervention-nav="true"]'))return;
        const a=document.createElement("a");
        a.href="/portal/interventions";
        a.dataset.interventionNav="true";
        a.className=pathname.startsWith("/portal/interventions")?"active":"";
        a.innerHTML='<span class="nav-icon" aria-hidden="true">✦</span><span class="nav-label">Mes prescriptions</span>';
        nav.appendChild(a);
      });
    }).catch(()=>{});
    return()=>{cancelled=true;};
  },[pathname]);
  return null;
}
