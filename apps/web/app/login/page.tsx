import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="login"><section className="login-brand"><div className="mark">P</div><p>PromoFlow</p><h1>Suas promoções,<br />sob seu comando.</h1><p className="muted">Acesso privado à central de operações.</p></section><LoginForm /></main>;
}
