import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="login">
      <section className="login-brand">
        <div className="mark">P</div>
        <p>PromoFlow</p>
        <h1>Suas promoções,<br />sob seu comando.</h1>
        <p className="muted">Acesso privado à central de operações.</p>
      </section>
      <LoginForm hasError={params.error === "credentials"} />
    </main>
  );
}
