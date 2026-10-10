-- Eén docent per groep. De docent wordt gekoppeld zodra hij de link deelt en ziet alleen resultaten van zijn eigen groepen.
create table if not exists public.docent_groep (
  vestiging text not null,
  groep text not null,
  email text not null check (email = lower(email)),
  created_at timestamptz not null default now(),
  primary key (vestiging, groep)          -- per groep maximaal één docent
);
alter table public.docent_groep enable row level security;

create policy "koppeling: eigen of beheerder lezen" on public.docent_groep
  for select to authenticated using (email = lower(coalesce(auth.jwt() ->> 'email','')) or (select public.is_staff()));
create policy "koppeling: docent koppelt zichzelf" on public.docent_groep
  for insert to authenticated with check (email = lower(coalesce(auth.jwt() ->> 'email','')) and (select public.my_role()) is not null);
create policy "koppeling: eigen of beheerder verwijderen" on public.docent_groep
  for delete to authenticated using (email = lower(coalesce(auth.jwt() ->> 'email','')) or (select public.is_staff()));

-- Welke groepen zijn al bezet (zodat een tweede docent ze niet meer kan kiezen)
create or replace function public.bezette_groepen()
returns table (vestiging text, groep text, email text)
language sql stable security definer set search_path = public as $$
  select dg.vestiging, dg.groep, dg.email from public.docent_groep dg
  where (select public.my_role()) is not null
$$;
revoke all on function public.bezette_groepen() from public, anon;
grant execute on function public.bezette_groepen() to authenticated;

drop policy if exists "responses: docenten en beheerders mogen lezen" on public.responses;
create policy "responses: beheerder alles, docent eigen groepen" on public.responses
  for select to authenticated using (
    (select public.is_staff())
    or exists (select 1 from public.docent_groep dg
               where dg.email = lower(coalesce(auth.jwt() ->> 'email',''))
                 and dg.vestiging = responses.vestiging and dg.groep = responses.groep));
