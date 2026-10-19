-- M2: the full data model (PRD §6). Replaces the M1 spike table.
-- The app checks names, loops and required fields; the server only enforces
-- what can never fail on valid app data, so offline uploads never jam.

drop table public.ingredients;

-- updated_at --------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tables ------------------------------------------------------------------
-- Ids are made on the phone, so synced tables have no id default.
-- Money is whole kobo in bigint; amounts, sizes, percentages and position are
-- double precision. Totals are never stored.

create table public.businesses (
  id uuid primary key,
  name text not null,
  currency_code text not null,
  default_pricing_method text not null default 'markup'
    check (default_pricing_method in ('markup', 'margin', 'fixed_profit', 'set_price')),
  default_pricing_percent double precision default 50,
  default_pricing_amount_minor bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.categories (
  id uuid primary key,
  business_id uuid not null references public.businesses (id),
  name text not null,
  position double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);

create table public.overhead_items (
  id uuid primary key,
  business_id uuid not null references public.businesses (id),
  name text not null,
  position double precision not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);

create table public.ingredients (
  id uuid primary key,
  business_id uuid not null references public.businesses (id),
  name text not null,
  unit text not null,
  -- Empty = missing; 0 is a real price.
  pack_price_minor bigint,
  pack_size double precision,
  pack_size_unit text,
  notes text,
  price_updated_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);

-- Server only: filled by record_price_history, never synced or read by the app.
create table public.ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  ingredient_id uuid not null,
  pack_price_minor bigint,
  pack_size double precision,
  pack_size_unit text,
  price_updated_at timestamptz,
  recorded_at timestamptz not null default now(),
  foreign key (business_id, ingredient_id)
    references public.ingredients (business_id, id) on delete cascade
);

create table public.recipes (
  id uuid primary key,
  business_id uuid not null references public.businesses (id),
  name text not null,
  -- Empty = Uncategorised.
  category_id uuid,
  notes text,
  yield_type text not null check (yield_type in ('weight', 'count')),
  yield_weight_g double precision,
  yield_count double precision,
  -- Empty = cost only.
  pricing_method text
    check (pricing_method in ('markup', 'margin', 'fixed_profit', 'set_price')),
  pricing_percent double precision,
  pricing_amount_minor bigint,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  -- Deleting a category clears only category_id; business_id stays.
  foreign key (business_id, category_id)
    references public.categories (business_id, id) on delete set null (category_id)
);

create table public.recipe_sections (
  id uuid primary key,
  business_id uuid not null references public.businesses (id),
  recipe_id uuid not null,
  -- Empty when it's the only section.
  name text,
  position double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, recipe_id) references public.recipes (business_id, id)
);

create table public.recipe_lines (
  id uuid primary key,
  business_id uuid not null references public.businesses (id),
  recipe_id uuid not null,
  section_id uuid not null,
  position double precision not null,
  ingredient_id uuid,
  sub_recipe_id uuid,
  amount double precision not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(ingredient_id, sub_recipe_id) = 1),
  foreign key (business_id, recipe_id) references public.recipes (business_id, id),
  -- A section delete may upload before its line deletes; take the lines with it.
  foreign key (business_id, section_id)
    references public.recipe_sections (business_id, id) on delete cascade,
  foreign key (business_id, ingredient_id) references public.ingredients (business_id, id),
  foreign key (business_id, sub_recipe_id) references public.recipes (business_id, id)
);

create table public.recipe_overhead_lines (
  id uuid primary key,
  business_id uuid not null references public.businesses (id),
  recipe_id uuid not null,
  overhead_item_id uuid not null,
  amount_minor bigint not null check (amount_minor >= 0),
  position double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, recipe_id) references public.recipes (business_id, id),
  foreign key (business_id, overhead_item_id)
    references public.overhead_items (business_id, id)
);

create trigger set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.business_members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.overhead_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ingredients
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recipe_sections
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recipe_lines
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recipe_overhead_lines
  for each row execute function public.set_updated_at();

-- Functions ---------------------------------------------------------------

create function public.is_member(p_business_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = (select auth.uid())
  );
$$;

-- Online only. One business per user in the MVP.
create function public.create_business(
  p_name text,
  p_currency_code text,
  p_pricing_method text,
  p_pricing_percent double precision,
  p_pricing_amount_minor bigint
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from public.business_members where user_id = v_user_id) then
    raise exception 'This account already has a business';
  end if;

  insert into public.businesses (
    id, name, currency_code,
    default_pricing_method, default_pricing_percent, default_pricing_amount_minor
  ) values (
    v_business_id, p_name, p_currency_code,
    p_pricing_method, p_pricing_percent, p_pricing_amount_minor
  );

  insert into public.business_members (business_id, user_id, role)
  values (v_business_id, v_user_id, 'owner');

  insert into public.overhead_items (id, business_id, name, position)
  select gen_random_uuid(), v_business_id, item.name, item.position
  from (values
    ('Gas', 1), ('Electricity', 2), ('Transport', 3), ('Labour', 4), ('Packaging', 5)
  ) as item (name, position);

  return v_business_id;
end;
$$;

revoke execute on function public.create_business from public, anon;
grant execute on function public.create_business to authenticated;

create function public.record_price_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ingredient_price_history (
    business_id, ingredient_id, pack_price_minor, pack_size, pack_size_unit, price_updated_at
  ) values (
    new.business_id, new.id, new.pack_price_minor, new.pack_size, new.pack_size_unit,
    new.price_updated_at
  );
  return null;
end;
$$;

create trigger record_price_history_on_insert after insert on public.ingredients
  for each row
  when (new.pack_price_minor is not null or new.pack_size is not null)
  execute function public.record_price_history();

create trigger record_price_history_on_update
  after update of pack_price_minor, pack_size, pack_size_unit on public.ingredients
  for each row
  when (
    old.pack_price_minor is distinct from new.pack_price_minor
    or old.pack_size is distinct from new.pack_size
    or old.pack_size_unit is distinct from new.pack_size_unit
  )
  execute function public.record_price_history();

-- Row Level Security ------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.categories enable row level security;
alter table public.overhead_items enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_price_history enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_sections enable row level security;
alter table public.recipe_lines enable row level security;
alter table public.recipe_overhead_lines enable row level security;

-- Created only by create_business; never deleted from the app.
create policy "businesses: select for members" on public.businesses
  for select to authenticated using (public.is_member(id));
create policy "businesses: update for members" on public.businesses
  for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));

-- Written only by create_business.
create policy "business_members: select own" on public.business_members
  for select to authenticated using (user_id = (select auth.uid()));

-- The seven business data tables: members can do everything.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'overhead_items', 'ingredients', 'recipes',
    'recipe_sections', 'recipe_lines', 'recipe_overhead_lines'
  ] loop
    execute format(
      'create policy "%1$s: select for members" on public.%1$I
         for select to authenticated using (public.is_member(business_id))', t);
    execute format(
      'create policy "%1$s: insert for members" on public.%1$I
         for insert to authenticated with check (public.is_member(business_id))', t);
    execute format(
      'create policy "%1$s: update for members" on public.%1$I
         for update to authenticated
         using (public.is_member(business_id)) with check (public.is_member(business_id))', t);
    execute format(
      'create policy "%1$s: delete for members" on public.%1$I
         for delete to authenticated using (public.is_member(business_id))', t);
  end loop;
end;
$$;

-- ingredient_price_history: no policies and no grants, so no app access.

-- Grants ------------------------------------------------------------------

revoke all on
  public.businesses, public.business_members, public.categories, public.overhead_items,
  public.ingredients, public.ingredient_price_history, public.recipes,
  public.recipe_sections, public.recipe_lines, public.recipe_overhead_lines
from anon, authenticated;

grant select, update on public.businesses to authenticated;
grant select on public.business_members to authenticated;
grant select, insert, update, delete on
  public.categories, public.overhead_items, public.ingredients, public.recipes,
  public.recipe_sections, public.recipe_lines, public.recipe_overhead_lines
to authenticated;

-- PowerSync ---------------------------------------------------------------
-- powersync_role (made in M0) reads the synced tables. The publication was
-- FOR ALL TABLES, which can't be altered into a list, so recreate it.

grant select on
  public.businesses, public.business_members, public.categories, public.overhead_items,
  public.ingredients, public.recipes, public.recipe_sections, public.recipe_lines,
  public.recipe_overhead_lines
to powersync_role;

drop publication if exists powersync;
create publication powersync for table
  public.businesses, public.business_members, public.categories, public.overhead_items,
  public.ingredients, public.recipes, public.recipe_sections, public.recipe_lines,
  public.recipe_overhead_lines;
