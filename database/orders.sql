create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  status text not null default 'pending_approval',
  amount_total integer,
  currency text,
  customer_email text,
  line_items jsonb,
  whcc_external_id text,
  whcc_response jsonb,
  whcc_last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

create or replace function public.set_updated_at_orders()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_updated_at on public.orders;

create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at_orders();
