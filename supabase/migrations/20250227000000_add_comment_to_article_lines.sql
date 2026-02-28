-- Ajout de la colonne comment pour les lignes d'articles
alter table public.article_lines add column if not exists comment text;
