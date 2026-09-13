"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function MessageBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/messages/unread", { cache: "no-store" });
        const data = await response.json();
        if (active) setCount(Number(data.count || 0));
      } catch {
        if (active) setCount(0);
      }
    };
    load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return <Link href="/portal/messages" className="message-bell" aria-label={count ? `${count} message${count > 1 ? "s" : ""} non lu${count > 1 ? "s" : ""}` : "Messagerie"} title="Messagerie">
    <span aria-hidden="true">✉</span>
    {count > 0 && <b>{count > 9 ? "9+" : count}</b>}
  </Link>;
}
