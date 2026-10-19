import { Activity, AlertTriangle, ArrowUpRight, Check, Clock3, MoreHorizontal, Pause, ShoppingBag } from "lucide-react";
import Link from "next/link";

const offers = [
  { store: "Shopee", title: "Fone Bluetooth QCY T13 ANC", price: "R$ 129,90", discount: "42%", status: "Revisar" },
  { store: "Amazon", title: "Echo Pop — Smart speaker", price: "R$ 224,10", discount: "28%", status: "Pronto" },
  { store: "AliExpress", title: "Projetor portátil Magcubic", price: "R$ 318,40", discount: "36%", status: "Revisar" },
];

export function Dashboard() {
  const demoEnabled=process.env.NODE_ENV!=="production"&&process.env.ENABLE_DEMO_MODE==="true";
  if(!demoEnabled)return <><section className="page-heading"><div><p className="eyebrow">Operação protegida</p><h1>Central de operações</h1><p>Conecte o Supabase e as integrações para carregar dados reais.</p></div></section><section className="empty panel"><span><Activity size={30}/></span><h2>Nenhum dado operacional</h2><p>Dados demonstrativos estão desativados. Configure o ambiente antes de habilitar automações.</p></section></>;
  return <>
    <section className="page-heading"><div><p className="eyebrow">Segunda, 19 de outubro</p><h1>Central de operações</h1><p>Acompanhe o que merece atenção antes da próxima publicação.</p></div><button className="primary"><Pause size={16}/> Automação pausada</button></section>
    <section className="ops-strip" aria-label="Resumo da operação"><div><span>Encontradas hoje</span><strong>38</strong><small><ArrowUpRight size={13}/> 12 desde a última busca</small></div><div><span>Aguardando revisão</span><strong>07</strong><small className="warn"><Clock3 size={13}/> Mais antiga há 36 min</small></div><div><span>Publicadas</span><strong>21</strong><small><Check size={13}/> 100% entregues</small></div><div><span>Falhas</span><strong>00</strong><small>Sem incidentes</small></div></section>
    <div className="dashboard-grid">
      <section className="panel queue"><header><div><p className="eyebrow">Fila de revisão</p><h2>Ofertas que pedem decisão</h2></div><Link href="/ofertas">Ver todas</Link></header><div className="offer-list">{offers.map((offer, index) => <article className="offer" key={offer.title}><div className="offer-rank">0{index + 1}</div><div className="product-thumb"><ShoppingBag size={22}/></div><div className="offer-main"><span>{offer.store}</span><strong>{offer.title}</strong><small>Dados demonstrativos</small></div><div className="price"><strong>{offer.price}</strong><span>−{offer.discount}</span></div><button aria-label={`Mais opções para ${offer.title}`}><MoreHorizontal/></button></article>)}</div>
      </section>
      <aside className="panel pulse"><p className="eyebrow">Pulso da automação</p><h2>Próxima janela</h2><div className="time">18:30</div><p>3 ofertas elegíveis para <strong>Achadinhos Tech</strong>.</p><div className="timeline"><i/><div><strong>17:54</strong><span>Busca concluída</span></div><div><strong>18:00</strong><span>Revisão de preços</span></div><div><strong>18:30</strong><span>Janela de envio</span></div></div><button className="secondary">Abrir fila</button></aside>
    </div>
    <section className="panel activity"><header><div><p className="eyebrow">Atividade recente</p><h2>Últimos eventos</h2></div><Activity size={20}/></header><div className="event-row"><span className="event-icon ok"><Check/></span><div><strong>Oferta publicada no Telegram</strong><p>Echo Pop · Achadinhos Tech</p></div><time>17:42</time></div><div className="event-row"><span className="event-icon warning"><AlertTriangle/></span><div><strong>Integração aguardando configuração</strong><p>WhatsApp · Elegibilidade ainda não verificada</p></div><time>16:10</time></div></section>
  </>;
}
