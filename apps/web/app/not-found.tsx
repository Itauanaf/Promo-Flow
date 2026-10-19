import Link from "next/link";

export default function NotFound() {
  return <main className="center-state"><p className="eyebrow">Página não encontrada</p><h1>Este caminho não existe.</h1><Link className="button" href="/dashboard">Voltar ao dashboard</Link></main>;
}
