create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null check (role in ('demandeur', 'gdr', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id bigserial primary key,
  reference text not null,
  type text not null check (type in ('creation', 'enrichissement', 'creation_enrichissement')),
  status text not null default 'envoye' check (status in ('envoye', 'recu', 'en_cours', 'en_attente', 'termine')),
  urgent boolean not null default false,
  urgent_reason text,
  demandeur_id uuid not null references public.profiles (id),
  gdr_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.article_lines (
  id bigserial primary key,
  ticket_id bigint not null references public.tickets (id) on delete cascade,
  nom_fournisseur text not null,
  marque text not null,
  ref_info text not null,
  ean text,
  ref_com text,
  designation text not null,
  tarif numeric(12,2),
  codag_attribue text,
  comment text
);

create table if not exists public.attachments (
  id bigserial primary key,
  ticket_id bigint not null references public.tickets (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.comments (
  id bigserial primary key,
  ticket_id bigint not null references public.tickets (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes utiles
create index if not exists idx_tickets_demandeur on public.tickets (demandeur_id);
create index if not exists idx_tickets_gdr on public.tickets (gdr_id);
create index if not exists idx_tickets_status on public.tickets (status);

