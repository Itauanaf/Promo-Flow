"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="center-state"><p className="eyebrow">Falha na interface</p><h1>Não foi possível abrir esta área.</h1><p>Os dados não foram alterados. Tente carregar a página novamente.</p><button onClick={reset}>Tentar novamente</button></main>;
}
