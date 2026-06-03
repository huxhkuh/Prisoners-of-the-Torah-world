create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  detainee_id text not null,
  detainee_name text not null,
  sender text not null default 'אנונימי',
  body text not null,
  donation numeric not null default 0 check (donation >= 0),
  created_at timestamptz not null default now()
);

alter table public.support_messages enable row level security;

drop policy if exists "Anyone can read support messages" on public.support_messages;
create policy "Anyone can read support messages"
on public.support_messages
for select
to anon
using (true);

drop policy if exists "Anyone can add support messages" on public.support_messages;
create policy "Anyone can add support messages"
on public.support_messages
for insert
to anon
with check (
  char_length(body) between 1 and 2000
  and char_length(sender) between 1 and 120
  and char_length(detainee_id) between 1 and 120
  and char_length(detainee_name) between 1 and 120
  and donation >= 0
);
