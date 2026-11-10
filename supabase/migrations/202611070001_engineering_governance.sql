create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('organization_admin', 'member', 'auditor')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  structure_id text not null,
  jurisdiction text not null,
  asset_type text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  unique (organization_id, structure_id)
);

create table if not exists public.project_memberships (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('project_admin', 'preparer', 'checker', 'approving_engineer', 'inspector', 'operator', 'auditor')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.rule_packs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  stable_key text not null,
  version text not null,
  jurisdiction text not null,
  asset_type text not null,
  approval_state text not null check (approval_state in ('draft', 'technical_review', 'software_verified', 'active', 'superseded')),
  rules jsonb not null,
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (stable_key, version)
);

create table if not exists public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  document_key text not null,
  revision text not null,
  revision_state text not null check (revision_state in ('current_unapproved', 'approved', 'superseded', 'unknown')),
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  sha256 text not null,
  storage_path text not null,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  unique (project_id, document_key, revision)
);

create table if not exists public.specialist_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  check_family text not null,
  conclusion text not null check (conclusion in ('pass', 'fail')),
  source_document_revision_id uuid not null references public.document_revisions(id) on delete restrict,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  checker_user_id uuid not null references auth.users(id) on delete restrict,
  approved boolean not null default false,
  issued_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (author_user_id <> checker_user_id)
);

create table if not exists public.review_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  snapshot_key text not null,
  engine_version text not null,
  rule_pack_id uuid not null references public.rule_packs(id) on delete restrict,
  input_fingerprint text not null,
  inputs jsonb not null,
  calculation jsonb not null,
  completeness jsonb not null,
  release_gate jsonb not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (project_id, snapshot_key)
);

create table if not exists public.review_approvals (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.review_snapshots(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('preparer', 'checker', 'approving_engineer')),
  decision text not null check (decision in ('approve', 'reject')),
  comment text not null default '',
  decided_at timestamptz not null default now(),
  unique (snapshot_id, role)
);

create table if not exists public.issued_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  snapshot_id uuid not null unique references public.review_snapshots(id) on delete restrict,
  report_number text not null,
  sha256 text not null,
  storage_path text not null,
  issued_by uuid not null references auth.users(id) on delete restrict,
  issued_at timestamptz not null default now(),
  superseded_by uuid references public.issued_reports(id) on delete restrict,
  unique (project_id, report_number)
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete restrict,
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create or replace function public.has_project_access(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = target_project_id and pm.user_id = auth.uid()
  ) or exists (
    select 1
    from public.projects p
    join public.organization_memberships om on om.organization_id = p.organization_id
    where p.id = target_project_id and om.user_id = auth.uid()
  );
$$;

create or replace function public.prevent_immutable_record_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'This engineering governance record is immutable';
end;
$$;

drop trigger if exists review_snapshots_immutable on public.review_snapshots;
create trigger review_snapshots_immutable
before update or delete on public.review_snapshots
for each row execute function public.prevent_immutable_record_change();

drop trigger if exists review_approvals_immutable on public.review_approvals;
create trigger review_approvals_immutable
before update or delete on public.review_approvals
for each row execute function public.prevent_immutable_record_change();

drop trigger if exists issued_reports_immutable on public.issued_reports;
create trigger issued_reports_immutable
before update or delete on public.issued_reports
for each row execute function public.prevent_immutable_record_change();

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.rule_packs enable row level security;
alter table public.document_revisions enable row level security;
alter table public.specialist_results enable row level security;
alter table public.review_snapshots enable row level security;
alter table public.review_approvals enable row level security;
alter table public.issued_reports enable row level security;
alter table public.audit_events enable row level security;

create policy "members read organizations" on public.organizations
for select using (exists (
  select 1 from public.organization_memberships om
  where om.organization_id = organizations.id and om.user_id = auth.uid()
));

create policy "members read organization memberships" on public.organization_memberships
for select using (user_id = auth.uid() or exists (
  select 1 from public.organization_memberships own
  where own.organization_id = organization_memberships.organization_id
    and own.user_id = auth.uid() and own.role = 'organization_admin'
));

create policy "members read projects" on public.projects
for select using (public.has_project_access(id));

create policy "members read project memberships" on public.project_memberships
for select using (public.has_project_access(project_id));

create policy "members read documents" on public.document_revisions
for select using (public.has_project_access(project_id));

create policy "members read specialist results" on public.specialist_results
for select using (public.has_project_access(project_id));

create policy "members read snapshots" on public.review_snapshots
for select using (public.has_project_access(project_id));

create policy "members read approvals" on public.review_approvals
for select using (exists (
  select 1 from public.review_snapshots rs
  where rs.id = review_approvals.snapshot_id and public.has_project_access(rs.project_id)
));

create policy "members read reports" on public.issued_reports
for select using (public.has_project_access(project_id));

create policy "members read audit events" on public.audit_events
for select using (project_id is not null and public.has_project_access(project_id));

create policy "members read applicable rule packs" on public.rule_packs
for select using (
  organization_id is null or exists (
    select 1 from public.organization_memberships om
    where om.organization_id = rule_packs.organization_id and om.user_id = auth.uid()
  )
);

comment on table public.review_snapshots is 'Immutable engineering input, rule, calculation, completeness, and release-gate snapshot.';
comment on table public.issued_reports is 'Immutable issued-report metadata. Binary content remains in private object storage.';
