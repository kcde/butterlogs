-- M1 spike only. M2 drops this table and builds the full data model (PRD §6).
-- Rows belong to the user who made them; M2 moves to business_id + is_member().

create table public.ingredients (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  unit text not null,
  pack_price_minor bigint,
  pack_size double precision,
  pack_size_unit text,
  created_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;

create policy "ingredients: select own" on public.ingredients
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "ingredients: insert own" on public.ingredients
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "ingredients: update own" on public.ingredients
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "ingredients: delete own" on public.ingredients
  for delete to authenticated using (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.ingredients to authenticated;

-- PowerSync reads through powersync_role (created in M0). The powersync
-- publication is FOR ALL TABLES until M2, so the table is included already.
grant select on public.ingredients to powersync_role;
