-- ============================================================
-- Migracion: Push notifications (FCM tokens por usuario)
-- ============================================================

create table if not exists user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios', 'web')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_push_tokens_user_id on user_push_tokens(user_id);
create index if not exists idx_user_push_tokens_active on user_push_tokens(is_active);

alter table user_push_tokens enable row level security;

drop policy if exists "Users can read own push tokens" on user_push_tokens;
create policy "Users can read own push tokens"
  on user_push_tokens
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own push tokens" on user_push_tokens;
create policy "Users can insert own push tokens"
  on user_push_tokens
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own push tokens" on user_push_tokens;
create policy "Users can update own push tokens"
  on user_push_tokens
  for update
  using (auth.uid() = user_id);

create or replace function touch_user_push_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_user_push_tokens_updated_at on user_push_tokens;
create trigger trg_touch_user_push_tokens_updated_at
before update on user_push_tokens
for each row
execute function touch_user_push_tokens_updated_at();
