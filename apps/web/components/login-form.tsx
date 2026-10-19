export function LoginForm({ hasError = false }: { hasError?: boolean }) {
  return (
    <form className="login-card" action="/auth/login" method="post">
      <div>
        <p className="eyebrow">Acesso do administrador</p>
        <h2>Entrar no painel</h2>
      </div>
      <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
      <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
      {hasError && <p className="form-error" role="alert">Credenciais inválidas ou acesso não autorizado.</p>}
      <button type="submit">Entrar</button>
      <p className="form-note">Não há cadastro público. Contas são criadas somente pelo administrador.</p>
    </form>
  );
}
