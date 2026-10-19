begin;

do $$
declare
  admin_user_id uuid;
begin
  select id
    into admin_user_id
    from auth.users
   where lower(email) = lower('itauanafonseca819@gmail.com')
   order by created_at asc
   limit 1;

  if admin_user_id is null then
    raise exception 'Administrator user was not found in auth.users';
  end if;

  insert into public.profiles (id, display_name, role)
  values (admin_user_id, 'Itauana', 'admin')
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role,
        updated_at = now();

  insert into public.app_settings (owner_id, timezone, default_currency, automation_enabled)
  values (admin_user_id, 'America/Recife', 'BRL', false)
  on conflict (owner_id) do nothing;
end
$$;

commit;
