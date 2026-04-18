-- Push tokens: one row per user (pre-launch scale; multi-device is a later concern)
create table public.push_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz default now()
);

alter table public.push_tokens enable row level security;

-- Users can read/write only their own token row
create policy "push_tokens_self"
  on public.push_tokens for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Track which aura_checks qualified for today's daily challenge
alter table public.aura_checks
  add column challenge_completed boolean not null default false;

-- Partial index for "did this user complete a challenge today" lookups
create index aura_checks_challenge_completed_idx
  on public.aura_checks (user_id, created_at)
  where challenge_completed = true;
