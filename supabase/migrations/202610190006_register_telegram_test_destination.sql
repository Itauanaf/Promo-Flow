begin;

insert into public.destinations (
  platform,
  external_chat_id,
  name,
  status,
  permissions,
  is_private,
  paused_at,
  test_destination
)
values (
  'telegram',
  '-1004291290113',
  'PromoFlow',
  'available',
  '{"can_send_messages": true, "verified_by_test_message": true}'::jsonb,
  true,
  now(),
  true
)
on conflict (platform, external_chat_id) do update
set name = excluded.name,
    status = excluded.status,
    permissions = excluded.permissions,
    is_private = excluded.is_private,
    paused_at = coalesce(public.destinations.paused_at, now()),
    test_destination = true,
    updated_at = now();

commit;
