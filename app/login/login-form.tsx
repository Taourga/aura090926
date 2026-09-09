"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(searchParams.get("error") === "access" ? "Votre compte est désactivé ou n'est pas encore configuré." : "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("Identifiants incorrects. Vérifiez votre adresse e-mail et votre mot de passe.");
      setLoading(false);
      return;
    }
    window.location.assign("/portal");
  }

  return <main className="login-shell">
    <section className="login-card">
      <Link className="brand" href="/"><span className="brand-mark">A</span>AURA</Link>
      <h1>Bienvenue</h1>
      <p>Connectez-vous à votre espace de séjour sécurisé.</p>
      <form onSubmit={handleSubmit}>
        {message && <p className="form-error" role="alert">{message}</p>}
        <label className="field">Adresse e-mail<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field">Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="button button-primary" style={{ width: "100%" }} disabled={loading}>{loading ? "Connexion..." : "Se connecter"}</button>
      </form>
      <p style={{ marginTop: 18, fontSize: ".88rem" }}>Votre accès est créé par la clinique. <Link href="/" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>Retour à l&apos;accueil</Link></p>
    </section>
  </main>;
}
