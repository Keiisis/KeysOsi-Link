-- ============================================================
-- GENEALOGIA — Schéma Supabase complet
-- Migration : 20260603_genealogia_schema.sql
-- ============================================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: trees (un arbre par utilisateur, ou plusieurs)
-- ============================================================
create table if not exists public.trees (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mon arbre',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TABLE: persons (chaque personne / nœud de l'arbre)
-- ============================================================
create table if not exists public.persons (
  id uuid primary key default uuid_generate_v4(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  gender text check (gender in ('male','female','other')),
  birth_date date,
  birth_place text,
  death_date date,
  death_place text,
  is_self boolean not null default false,
  -- rôle généalogique relatif au demandeur
  relation_role text, -- self, father, mother, paternal_grandfather, etc.
  -- liens de parenté
  father_id uuid references public.persons(id) on delete set null,
  mother_id uuid references public.persons(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TABLE: documents (coffre-fort documentaire)
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tree_id uuid not null references public.trees(id) on delete cascade,
  person_id uuid references public.persons(id) on delete cascade,
  doc_type text not null,        -- birth_certificate, marriage_certificate, etc.
  title text,
  file_path text,                -- chemin dans le bucket Supabase Storage
  file_url text,
  issued_date date,              -- date d'émission du document (pour règle < 3 mois)
  expires_check boolean not null default false, -- soumis à la règle "moins de 3 mois"
  metadata jsonb default '{}'::jsonb, -- infos extraites (OCR)
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABLE: dossiers (suivi des 2 dossiers par arbre)
-- ============================================================
create table if not exists public.dossiers (
  id uuid primary key default uuid_generate_v4(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dossier_type text not null check (dossier_type in ('afro_descendance','ancetre_esclavage')),
  status text not null default 'in_progress',
  progress numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tree_id, dossier_type)
);

-- ============================================================
-- INDEX
-- ============================================================
create index if not exists idx_persons_tree on public.persons(tree_id);
create index if not exists idx_documents_person on public.documents(person_id);
create index if not exists idx_documents_tree on public.documents(tree_id);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_trees_updated on public.trees;
create trigger trg_trees_updated before update on public.trees
for each row execute function public.set_updated_at();

drop trigger if exists trg_persons_updated on public.persons;
create trigger trg_persons_updated before update on public.persons
for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.trees enable row level security;
alter table public.persons enable row level security;
alter table public.documents enable row level security;
alter table public.dossiers enable row level security;

-- Policies: chaque utilisateur ne voit/édite que ses données
drop policy if exists "own_trees" on public.trees;
create policy "own_trees" on public.trees
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_persons" on public.persons;
create policy "own_persons" on public.persons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_documents" on public.documents;
create policy "own_documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_dossiers" on public.dossiers;
create policy "own_dossiers" on public.dossiers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET (à créer + policies)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('genealogia-docs', 'genealogia-docs', false)
on conflict (id) do nothing;

drop policy if exists "own_docs_select" on storage.objects;
create policy "own_docs_select" on storage.objects
  for select using (bucket_id = 'genealogia-docs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "own_docs_insert" on storage.objects;
create policy "own_docs_insert" on storage.objects
  for insert with check (bucket_id = 'genealogia-docs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "own_docs_delete" on storage.objects;
create policy "own_docs_delete" on storage.objects
  for delete using (bucket_id = 'genealogia-docs' and auth.uid()::text = (storage.foldername(name))[1]);
