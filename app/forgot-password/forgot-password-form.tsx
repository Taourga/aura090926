"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrorMessage("L’envoi a échoué. Réessayez dans quelques instants.");
    } else {
      setMessage("Si cette adresse existe, un lien de réinitialisation vient d’être envoyé.");
    }
    setLoading(false);
  }

  return <main className="login-shell">
    <section className="login-card">
      <Link className="brand" href="/"><span className="brand-mark">A</span>AURA</Link>
      <h1>Réinitialiser le mot de passe</h1>
      <p>Saisissez votre adresse e-mail pour recevoir un nouveau lien sécurisé.</p>
      <form onSubmit={handleSubmit}>
        {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
        <label className="field">Adresse e-mail<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <button className="button button-primary" style={{ width: "100%" }} disabled={loading}>{loading ? "Envoi..." : "Recevoir un lien"}</button>
      </form>
      <p className="login-help"><Link href="/login">Retour à la connexion</Link></p>
    </section>
  </main>;
}
