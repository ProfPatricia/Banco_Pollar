create table if not exists public.students (
  id uuid primary key,
  name text not null,
  series text not null,
  class_name text not null,
  balance integer not null default 0,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;

drop policy if exists "Permitir leitura dos alunos" on public.students;
drop policy if exists "Permitir cadastro dos alunos" on public.students;
drop policy if exists "Permitir atualização dos alunos" on public.students;
drop policy if exists "Permitir remoção dos alunos" on public.students;

create policy "Permitir leitura dos alunos"
on public.students for select
to anon
using (true);

create policy "Permitir cadastro dos alunos"
on public.students for insert
to anon
with check (true);

create policy "Permitir atualização dos alunos"
on public.students for update
to anon
using (true)
with check (true);

create policy "Permitir remoção dos alunos"
on public.students for delete
to anon
using (true);
