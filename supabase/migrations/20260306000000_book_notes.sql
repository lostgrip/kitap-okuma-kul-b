-- Personal book notes (private, not visible to others)
create table if not exists book_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  note_text text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, book_id)
);

alter table book_notes enable row level security;

create policy "Users can manage their own notes"
  on book_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_book_notes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger book_notes_updated_at
  before update on book_notes
  for each row execute function update_book_notes_updated_at();
