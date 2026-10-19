import { Activity, AlertTriangle, ArrowUpRight, Check, Clock3, MoreHorizontal, Pause, Play, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setGlobalAutomation } from "@/app/actions";

const offers = [
  { store: "Shopee", title: "Fone Bluetooth QCY T13 ANC", price: "R$ 129,90", discount: "42%", status: "Revisar" },
  { store: "Amazon", title: "Echo Pop — Smart speaker", price: "R$ 224,10", discount: "28%", status: "Pronto" },
  { store: "AliExpress", title: "Projetor portátil Magcubic", price: "R$ 318,40", discount: "36%", status: "Revisar" },
];

export async function Dashboard() {
  const demoEnabled=process.env.NODE_ENV!=="production"&&process.env.ENABLE_DEMO_MODE==="true";
  if(!demoEnabled){
    const supabase=await createSupabaseServerClient();
    const [{count:found=0},{count:waiting=0},{count:published=0},{count:failed=0},{data:rawOffers},{data:rawJobs},{data:rawSettings}]=await Promise.all([
      supabase.from("offers").select("*",{count:"exact",head:true}),
      supabase.from("publication_jobs").select("*",{count:"exact",head:true}).in("status",["waiting","processing"]),
      supabase.from("publication_jobs").select("*",{count:"exact",head:true}).eq("status","published"),
      supabase.from("publication_jobs").select("*",{count:"exact",head:true}).eq("status","failed"),
      supabase.from("offers").select("id,price,discount_percent,products!inner(title,store)").order("captured_at",{ascending:false}).limit(5),
      supabase.from("publication_jobs").select("id,status,created_at,destinations(name)").order("created_at",{ascending:false}).limit(5),
      supabase.from("app_settings").select("automation_enabled").limit(1),
    ]);
    const recentOffers=rawOffers??[];const recentJobs=rawJobs??[];const enabled=Boolean(rawSettings?.[0]?.automation_enabled);
    return <>
      <section className="page-heading"><div><p className="eyebrow">Operação real</p><h1>Central de operações</h1><p>Acompanhe ofertas, fila e entregas registradas no Supabase.</p></div><form action={setGlobalAutomation}><input type="hidden" name="enabled" value={enabled?"false":"true"}/><button className={enabled?"danger":"primary"}>{enabled?<><Pause size={16}/>Pausar automação</>:<><Play size={16}/>Ativar automação</>}</button></form></section>
      <section className="ops-strip" aria-label="Resumo da operação"><div><span>Ofertas cadastradas</span><strong>{found??0}</strong><small>Dados verificados</small></div><div><span>Na fila</span><strong>{waiting??0}</strong><small className="warn"><Clock3 size={13}/> Aguardando processamento</small></div><div><span>Publicadas</span><strong>{published??0}</strong><small><Check size={13}/> Registradas</small></div><div><span>Falhas</span><strong>{failed??0}</strong><small>Consulte publicações</small></div></section>
      <div className="dashboard-grid"><section className="panel queue"><header><div><p className="eyebrow">Ofertas</p><h2>Mais recentes</h2></div><Link href="/ofertas">Gerenciar</Link></header>{recentOffers.length?recentOffers.map((offer,index)=>{const product=Array.isArray(offer.products)?offer.products[0]:offer.products;return <article className="offer" key={offer.id}><div className="offer-rank">{String(index+1).padStart(2,"0")}</div><div className="product-thumb"><ShoppingBag size={22}/></div><div className="offer-main"><span>{product?.store}</span><strong>{product?.title}</strong><small>Oferta verificada</small></div><div className="price"><strong>R$ {Number(offer.price).toFixed(2).replace(".",",")}</strong><span>{offer.discount_percent?`−${offer.discount_percent}%`:"Sem desconto"}</span></div></article>}):<p className="compact-empty">Cadastre a primeira oferta.</p>}</section><aside className="panel pulse"><p className="eyebrow">Segurança</p><h2>Estado da automação</h2><div className="time">{enabled?"ATIVA":"PAUSA"}</div><p>{enabled?"As regras habilitadas podem processar itens elegíveis.":"Nenhum envio automático será iniciado."}</p><Link className="button secondary" href="/automacoes">Abrir automações</Link></aside></div>
      <section className="panel activity"><header><div><p className="eyebrow">Atividade real</p><h2>Fila recente</h2></div><Activity size={20}/></header>{recentJobs.length?recentJobs.map((job)=>{const destination=Array.isArray(job.destinations)?job.destinations[0]:job.destinations;return <div className="event-row" key={job.id}><span className={`event-icon ${job.status==="published"?"ok":"warning"}`}>{job.status==="published"?<Check/>:<Clock3/>}</span><div><strong>{job.status}</strong><p>{destination?.name??"Destino"}</p></div><time>{new Date(job.created_at).toLocaleDateString("pt-BR")}</time></div>}):<p className="compact-empty">Nenhuma atividade registrada.</p>}</section>
    </>;
  }
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
