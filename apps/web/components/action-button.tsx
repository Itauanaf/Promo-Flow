"use client";

import Link from "next/link";
import { ArrowRight, Plus, X } from "lucide-react";
import { useState } from "react";

type Props = {
  label: string;
  title: string;
  description: string;
  nextHref?: string;
  nextLabel?: string;
  secondary?: boolean;
};

export function ActionButton({ label, title, description, nextHref, nextLabel, secondary = false }: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={secondary ? "secondary" : "primary"} onClick={() => setOpen(true)}>
      {!secondary && <Plus size={16} />}{label}
    </button>
    {open && <div className="action-backdrop" onMouseDown={() => setOpen(false)}>
      <section className="action-dialog panel" role="dialog" aria-modal="true" aria-labelledby="action-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="action-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18} /></button>
        <p className="eyebrow">Próxima etapa</p>
        <h2 id="action-title">{title}</h2>
        <p>{description}</p>
        <div className="action-dialog-buttons">
          <button type="button" className="secondary" onClick={() => setOpen(false)}>Voltar</button>
          {nextHref && <Link className="button primary" href={nextHref} onClick={() => setOpen(false)}>{nextLabel ?? "Continuar"}<ArrowRight size={15} /></Link>}
        </div>
      </section>
    </div>}
  </>;
}
