-- Chạy một lần trong Supabase SQL Editor (project gcublxyygctavgxmwazp).
-- Link rút gọn faocamera.vn/l/{code} cho staff gửi khách.

create table if not exists public.short_links (
  code text primary key,
  long_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists short_links_long_url_idx on public.short_links (long_url);

alter table public.short_links enable row level security;

drop policy if exists "short_links_anon_insert" on public.short_links;
create policy "short_links_anon_insert"
  on public.short_links for insert to anon
  with check (true);

drop policy if exists "short_links_anon_select" on public.short_links;
create policy "short_links_anon_select"
  on public.short_links for select to anon
  using (true);
