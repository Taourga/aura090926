"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function readSession() {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) setSessionReady(true);
      if (mounted) setChecking(false);
    }

    void readSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) setSessionReady(true);
      if (mounted) setChecking(false);
    });
    const fallback = window.setTimeout(() => mounted && setChecking(false), 2200);

    return () => {
      mounted = false;
      window.clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("Choisissez un mot de passe d’au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Les deux mots de passe doivent être identiques.");
      return;
    }

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setMessage("Ce lien est invalide ou a expiré. Demandez-en un nouveau.");
      setLoading(false);
      return;
    }
    window.location.assign("/portal");
  }

  const unavailable = !checking && !sessionReady;

  return <main className="login-shell">
    <section className="login-card">
      <Link className="brand" href="/"><span className="brand-mark">A</span>AURA</Link>
      <h1>Choisir un mot de passe</h1>
      <p>Créez un mot de passe personnel pour sécuriser votre accès AURA.</p>
      {checking && <p className="form-success" role="status">Vérification du lien sécurisé…</p>}
      {unavailable && <p className="form-error" role="alert">Ce lien est invalide ou a expiré. Demandez un nouveau lien ci-dessous.</p>}
      {message && <p className="form-error" role="alert">{message}</p>}
      {!unavailable && <form onSubmit={handleSubmit}>
        <label className="field">Nouveau mot de passe<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required disabled={checking || loading} /></label>
        <label className="field">Confirmer le mot de passe<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required disabled={checking || loading} /></label>
        <button className="button button-primary" style={{ width: "100%" }} disabled={checking || loading}>{loading ? "Enregistrement..." : "Enregistrer et accéder à mon espace"}</button>
      </form>}
      <p className="login-help"><Link href="/forgot-password">Demander un nouveau lien</Link></p>
    </section>
  </main>;
}
