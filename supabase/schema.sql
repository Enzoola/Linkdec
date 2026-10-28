-- Linkdeck database schema. Run this once in the Supabase SQL editor.
-- Safe to re-run on an empty project; it is not a migration tool.

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,30}$')
    check (username not in (
      'admin','api','app','auth','dashboard','login','logout','signup','signin','settings',
      'support','help','about','terms','privacy','static','assets','_next','favicon','robots',
      'sitemap','www','mail','root','null','undefined','linkdeck','go','new','explore'
    )),
  name text not null default '' check (char_length(name) <= 40),
  headline text not null default '' check (char_length(headline) <= 70),
  bio text not null default '' check (char_length(bio) <= 200),
  theme text not null default 'lagos' check (theme in ('ink','chalk','sun','lagos','cobalt')),
  shape text not null default 'round' check (shape in ('square','round','pill')),
  fill text not null default 'solid' check (fill in ('solid','outline','soft')),
  disabled boolean not null default false,      -- set by you (service role) to take a page down
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- links
create table public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('link','header','social')),
  title text not null default '' check (char_length(title) <= 60),
  url text not null default '' check (char_length(url) <= 2000),
  position integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind = 'header' or url ~* '^https?://[^[:space:]]+$')
);
create index links_user_position_idx on public.links (user_id, position);

create function public.enforce_link_limit() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.links where user_id = new.user_id) >= 60 then
    raise exception 'You can have at most 60 links.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger links_limit before insert on public.links
  for each row execute function public.enforce_link_limit();

-- ------------------------------------------------------------------ events
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  link_id uuid references public.links (id) on delete set null,
  type text not null check (type in ('view','click')),
  referrer text check (referrer is null or char_length(referrer) <= 200),
  created_at timestamptz not null default now()
);
create index events_user_time_idx on public.events (user_id, created_at desc);

-- ------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.events enable row level security;

create policy "profiles are public unless disabled" on public.profiles
  for select using (not disabled or auth.uid() = id);
create policy "users create their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "users edit their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "visible links are public" on public.links
  for select using (
    auth.uid() = user_id
    or (enabled and exists (select 1 from public.profiles p where p.id = user_id and not p.disabled))
  );
create policy "users add their own links" on public.links
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users edit their own links" on public.links
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete their own links" on public.links
  for delete to authenticated using (auth.uid() = user_id);

create policy "users read their own events" on public.events
  for select to authenticated using (auth.uid() = user_id);
-- No insert policy on events: only the two functions below can write them.

-- Column-level privileges. Users can never set `disabled`, change their id or username.
revoke all on public.profiles, public.links, public.events from anon, authenticated;
grant select on public.profiles, public.links to anon, authenticated;
grant select on public.events to authenticated;
grant insert (id, username, name, headline, bio, theme, shape, fill) on public.profiles to authenticated;
grant update (name, headline, bio, theme, shape, fill) on public.profiles to authenticated;
grant insert (id, user_id, kind, title, url, position, enabled) on public.links to authenticated;
grant update (kind, title, url, position, enabled) on public.links to authenticated;
grant delete on public.links to authenticated;

-- ------------------------------------------------------- tracking functions
-- Anonymous visitors cannot write to tables. They call these instead.
create function public.track_view(p_username text, p_referrer text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.events (user_id, type, referrer)
  select id, 'view', left(nullif(p_referrer, ''), 200)
  from public.profiles
  where username = lower(p_username) and not disabled;
$$;

create function public.track_click(p_link_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_user uuid;
begin
  select l.url, l.user_id into v_url, v_user
  from public.links l join public.profiles p on p.id = l.user_id
  where l.id = p_link_id and l.enabled and l.kind <> 'header' and not p.disabled;
  if v_url is null then
    return null;
  end if;
  insert into public.events (user_id, link_id, type) values (v_user, p_link_id, 'click');
  return v_url;
end $$;

revoke all on function public.track_view(text, text), public.track_click(uuid) from public;
grant execute on function public.track_view(text, text), public.track_click(uuid) to anon, authenticated;

-- --------------------------------------------------------------- dashboard
-- Runs as the caller, so it can only ever see the caller's own events.
create function public.dashboard_stats(p_days integer default 14, p_tz text default 'UTC')
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  tz text := coalesce(p_tz, 'UTC');
  d integer := least(greatest(coalesce(p_days, 14), 1), 90);
  start_day date;
  res jsonb;
begin
  begin
    perform now() at time zone tz;
  exception when others then
    tz := 'UTC';
  end;
  start_day := (now() at time zone tz)::date - (d - 1);

  with days as (
    select g::date as day
    from generate_series(start_day, (now() at time zone tz)::date, interval '1 day') g
  ),
  ev as (
    select (created_at at time zone tz)::date as day, type, link_id, referrer
    from public.events
    where user_id = auth.uid()
      and created_at >= (start_day::timestamp at time zone tz)
  ),
  daily as (
    select days.day,
           count(*) filter (where ev.type = 'view') as views,
           count(*) filter (where ev.type = 'click') as clicks
    from days left join ev on ev.day = days.day
    group by days.day
  ),
  per_link as (
    select link_id, count(*) as clicks
    from ev where type = 'click' and link_id is not null
    group by link_id
  ),
  refs as (
    select coalesce(nullif(referrer, ''), 'Direct') as referrer, count(*) as views
    from ev where type = 'view'
    group by 1 order by 2 desc limit 5
  )
  select jsonb_build_object(
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'views', views, 'clicks', clicks) order by day), '[]'::jsonb) from daily),
    'per_link', (select coalesce(jsonb_agg(jsonb_build_object('link_id', link_id, 'clicks', clicks)), '[]'::jsonb) from per_link),
    'referrers', (select coalesce(jsonb_agg(jsonb_build_object('referrer', referrer, 'views', views) order by views desc), '[]'::jsonb) from refs)
  ) into res;
  return res;
end $$;

revoke all on function public.dashboard_stats(integer, text) from public, anon;
grant execute on function public.dashboard_stats(integer, text) to authenticated;

-- -------------------------------------------------------------------- save
-- Saves the profile and the full ordered link list in one transaction.
-- Links missing from the list are deleted. Runs as the caller, so row level
-- security still applies: nobody can touch another person's rows.
create function public.save_page(p_profile jsonb, p_links jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.profiles set
    name = coalesce(p_profile->>'name', name),
    headline = coalesce(p_profile->>'headline', headline),
    bio = coalesce(p_profile->>'bio', bio),
    theme = coalesce(p_profile->>'theme', theme),
    shape = coalesce(p_profile->>'shape', shape),
    fill = coalesce(p_profile->>'fill', fill)
  where id = auth.uid();

  delete from public.links
  where user_id = auth.uid()
    and id not in (select (x->>'id')::uuid from jsonb_array_elements(p_links) x);

  insert into public.links (id, user_id, kind, title, url, position, enabled)
  select (x->>'id')::uuid, auth.uid(), x->>'kind', coalesce(x->>'title', ''),
         case when x->>'kind' = 'header' then '' else coalesce(x->>'url', '') end,
         (ord - 1)::integer, coalesce((x->>'enabled')::boolean, true)
  from jsonb_array_elements(p_links) with ordinality as t(x, ord)
  on conflict (id) do update set
    kind = excluded.kind, title = excluded.title, url = excluded.url,
    position = excluded.position, enabled = excluded.enabled;
end $$;

revoke all on function public.save_page(jsonb, jsonb) from public, anon;
grant execute on function public.save_page(jsonb, jsonb) to authenticated;
