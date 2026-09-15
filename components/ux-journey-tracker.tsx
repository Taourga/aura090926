"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMBER_SEGMENT = /^\d+$/;
const TEST_KEY = "aura-ux-test-enabled";

function sanitizePath(value: string) {
  return value.split("/").map((part) => UUID_SEGMENT.test(part) || NUMBER_SEGMENT.test(part) ? ":id" : part).join("/").slice(0, 180);
}

function sessionId() {
  const key = "aura-ux-test-session";
  const current = window.sessionStorage.getItem(key);
  if (current) return current;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

function send(eventType: "page_view" | "nav_click" | "action_click" | "menu_open", path: string, target?: string) {
  if (window.sessionStorage.getItem(TEST_KEY) !== "1") return;
  void fetch("/api/ux-event", {
    method: "POST",
    headers: { "content-type": "application/json", "x-aura-ux-test": "1" },
    keepalive: true,
    body: JSON.stringify({ eventType, path: sanitizePath(path), target: target ? sanitizePath(target) : null, sessionId: sessionId() }),
  }).catch(() => undefined);
}

export function UxJourneyTracker() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ux_test") === "1") window.sessionStorage.setItem(TEST_KEY, "1");
    if (params.get("ux_test") === "0") {
      window.sessionStorage.removeItem(TEST_KEY);
      window.sessionStorage.removeItem("aura-ux-test-session");
    }
    setActive(window.sessionStorage.getItem(TEST_KEY) === "1");
  }, [pathname]);

  useEffect(() => {
    if (!active || !pathname.startsWith("/portal")) return;
    send("page_view", pathname);
  }, [active, pathname]);

  useEffect(() => {
    if (!active || !pathname.startsWith("/portal")) return;
    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest("a[href],button[data-ux-action]") : null;
      if (!element) return;
      if (element instanceof HTMLAnchorElement) {
        const url = new URL(element.href, window.location.origin);
        if (url.origin !== window.location.origin || !url.pathname.startsWith("/portal")) return;
        send("nav_click", pathname, url.pathname);
        return;
      }
      const action = element.getAttribute("data-ux-action");
      if (action) send("action_click", pathname, `/action/${action}`);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, pathname]);

  if (!active || !pathname.startsWith("/portal")) return null;
  return <div style={{position:"fixed",right:12,bottom:88,zIndex:120,background:"#0d2c44",color:"white",padding:"8px 10px",borderRadius:10,fontSize:12,boxShadow:"0 8px 22px rgba(13,44,68,.18)"}}>Mode test UX actif</div>;
}
