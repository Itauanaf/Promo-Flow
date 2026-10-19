begin;

create extension if not exists pgcrypto;
create type public.store as enum ('shopee','amazon','mercado_livre','aliexpress');
create type public.messaging_platform as enum ('telegram','whatsapp');
create type public.integration_status as enum ('not_configured','pending','available','unavailable');
create type public.approval_status as enum ('pending','approved','rejected');
create type public.job_status as enum ('waiting','processing','published','failed','cancelled','unknown');
create type public.approval_mode as enum ('manual','automatic');

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null, role text not null default 'admin' check (role = 'admin'), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index profiles_single_admin_uidx on public.profiles ((role)) where role = 'admin';
create table public.app_settings (id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references public.profiles(id) on delete cascade, timezone text not null default 'America/Sao_Paulo', default_currency text not null default 'BRL', automation_enabled boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.store_integrations (id uuid primary key default gen_random_uuid(), store public.store not null unique, status public.integration_status not null default 'not_configured', credential_ref text, last_sync_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.affiliate_accounts (id uuid primary key default gen_random_uuid(), store public.store not null, affiliate_identifier text not null, status public.integration_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(store, affiliate_identifier));
create table public.products (id uuid primary key default gen_random_uuid(), store public.store not null, external_id text not null, title text not null, category text, image_url text, product_url text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(store, external_id));
create index products_store_idx on public.products(store);
create table public.offers (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, price numeric(14,2) not null check(price >= 0), original_price numeric(14,2) check(original_price >= 0), discount_percent numeric(5,2) check(discount_percent between 0 and 100), coupon_code text, source text not null, expires_at timestamptz, captured_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index offers_product_captured_idx on public.offers(product_id, captured_at desc);
create table public.price_history (id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.offers(id) on delete cascade, price numeric(14,2) not null check(price >= 0), original_price numeric(14,2) check(original_price >= 0), coupon_code text, source text not null, captured_at timestamptz not null default now());
create index price_history_offer_captured_idx on public.price_history(offer_id, captured_at desc);
create table public.affiliate_links (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, affiliate_account_id uuid not null references public.affiliate_accounts(id) on delete restrict, url text not null, validation_status public.integration_status not null default 'pending', verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(product_id, affiliate_account_id));
create table public.destinations (id uuid primary key default gen_random_uuid(), platform public.messaging_platform not null, external_chat_id text not null, name text not null, status public.integration_status not null default 'pending', permissions jsonb not null default '{}'::jsonb, is_private boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(platform, external_chat_id));
create table public.automation_rules (id uuid primary key default gen_random_uuid(), name text not null, enabled boolean not null default false, filters jsonb not null default '{}'::jsonb, schedule jsonb not null default '{}'::jsonb, approval_mode public.approval_mode not null default 'manual', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.automation_destinations (automation_id uuid not null references public.automation_rules(id) on delete cascade, destination_id uuid not null references public.destinations(id) on delete cascade, primary key(automation_id,destination_id));
create table public.message_templates (id uuid primary key default gen_random_uuid(), name text not null, body text not null, store public.store, platform public.messaging_platform, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.promotion_drafts (id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.offers(id) on delete restrict, affiliate_link_id uuid not null references public.affiliate_links(id) on delete restrict, content text not null, approval_status public.approval_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.publication_jobs (id uuid primary key default gen_random_uuid(), draft_id uuid not null references public.promotion_drafts(id) on delete restrict, destination_id uuid not null references public.destinations(id) on delete restrict, scheduled_at timestamptz not null, status public.job_status not null default 'waiting', idempotency_key text not null unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index publication_jobs_status_schedule_idx on public.publication_jobs(status, scheduled_at);
create table public.publication_attempts (id uuid primary key default gen_random_uuid(), job_id uuid not null references public.publication_jobs(id) on delete cascade, attempt_number integer not null check(attempt_number > 0), response_code text, error text, created_at timestamptz not null default now(), unique(job_id, attempt_number));
create table public.publications (id uuid primary key default gen_random_uuid(), job_id uuid not null unique references public.publication_jobs(id) on delete restrict, offer_id uuid not null references public.offers(id) on delete restrict, affiliate_link_id uuid not null references public.affiliate_links(id) on delete restrict, destination_id uuid not null references public.destinations(id) on delete restrict, external_message_id text not null, published_at timestamptz not null default now());
create table public.click_events (id uuid primary key default gen_random_uuid(), publication_id uuid not null references public.publications(id) on delete cascade, occurred_at timestamptz not null default now(), referrer text);
create index click_events_publication_occurred_idx on public.click_events(publication_id, occurred_at desc);
create table public.notifications (id uuid primary key default gen_random_uuid(), type text not null, message text not null, read_at timestamptz, created_at timestamptz not null default now());
create table public.audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null, action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','app_settings','store_integrations','affiliate_accounts','products','offers','affiliate_links','destinations','automation_rules','message_templates','promotion_drafts','publication_jobs'] loop execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t); end loop; end $$;

do $$ declare t text; begin foreach t in array array['profiles','app_settings','store_integrations','affiliate_accounts','products','offers','price_history','affiliate_links','destinations','automation_rules','automation_destinations','message_templates','promotion_drafts','publication_jobs','publication_attempts','publications','click_events','notifications'] loop execute format('alter table public.%I enable row level security',t); execute format('create policy admin_all on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',t); end loop; end $$;
alter table public.audit_logs enable row level security;
create policy admin_read_audit on public.audit_logs for select to authenticated using ((select public.is_admin()));
create policy admin_insert_audit on public.audit_logs for insert to authenticated with check ((select public.is_admin()) and actor_id = (select auth.uid()));

create or replace function public.prevent_audit_mutation() returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'audit_logs are append-only'; end $$;
create trigger audit_logs_append_only before update or delete on public.audit_logs for each row execute function public.prevent_audit_mutation();

-- Credentials are referenced by opaque IDs only. This table never enters the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.integration_secrets (id uuid primary key default gen_random_uuid(), ciphertext bytea not null, key_version integer not null, created_at timestamptz not null default now(), rotated_at timestamptz);
revoke all on all tables in schema private from public, anon, authenticated;

comment on table public.publications is 'Immutable record of the exact offer, affiliate link and destination used.';
comment on column public.store_integrations.credential_ref is 'Opaque reference to private.integration_secrets or an external secret manager.';
commit;
