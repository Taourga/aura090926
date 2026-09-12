"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(searchParams.get("error") === "access" ? "Votre compte n’est pas actif ou n’est pas encore rattaché à un établissement." : "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("Connexion impossible. Vérifiez votre e-mail et votre mot de passe.");
      setLoading(false);
      return;
    }
    window.location.assign("/portal");
  }

  return <main className="login-shell">
    <section className="login-card">
      <Link className="brand" href="/"><span className="brand-mark">A</span><span>AURA</span></Link>
      <h1>Connexion à AURA</h1>
      <p>Retrouvez votre espace patient ou professionnel, selon le rôle attribué par votre établissement.</p>
      <form onSubmit={handleSubmit}>
        {message && <p className="form-error" role="alert">{message}</p>}
        <label className="field">E-mail<input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field">Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="button button-primary" style={{ width: "100%" }} disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button>
      </form>
      <p className="login-help"><Link href="/forgot-password">Mot de passe oublié ?</Link></p>
      <p style={{ marginTop: 18, fontSize: ".84rem", color: "var(--muted)" }}>Votre accès est créé ou invité par votre clinique. <Link href="/" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>Retour à la présentation d’AURA</Link></p>
    </section>
  </main>;
}
