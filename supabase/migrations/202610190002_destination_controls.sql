begin;
alter table public.destinations add column paused_at timestamptz;
alter table public.destinations add column test_destination boolean not null default false;
comment on column public.destinations.paused_at is 'Non-null blocks publication to this destination.';
comment on column public.destinations.test_destination is 'Only controlled destinations should be used for test sends.';
commit;
