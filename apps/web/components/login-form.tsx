"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function LoginForm() {
  const [error, setError] = useState("");
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function login(formData: FormData) {
    if (!configured) { setError("Configure o Supabase para habilitar o acesso real."); return; }
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
    if (authError) setError("Credenciais inválidas ou acesso não autorizado.");
    else window.location.href = "/dashboard";
  }

  return <form className="login-card" action={login}><div><p className="eyebrow">Acesso do administrador</p><h2>Entrar no painel</h2></div><label>E-mail<input name="email" type="email" autoComplete="email" required /></label><label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button type="submit">Entrar</button><p className="form-note">Não há cadastro público. Contas são criadas somente pelo administrador.</p></form>;
}
