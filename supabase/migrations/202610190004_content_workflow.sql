begin;
alter table public.message_templates add column if not exists affiliate_disclosure text;
alter table public.message_templates add column if not exists version integer not null default 1;
alter table public.promotion_drafts add column if not exists facts_snapshot jsonb not null default '{}'::jsonb;
alter table public.promotion_drafts add column if not exists generated_by text not null default 'template';
alter table public.promotion_drafts add column if not exists approved_at timestamptz;
alter table public.promotion_drafts add column if not exists approved_by uuid references public.profiles(id) on delete set null;
comment on column public.promotion_drafts.facts_snapshot is 'Immutable commercial facts used to render or validate generated content.';
commit;
