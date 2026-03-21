-- =============================================
-- Swipet Initial Schema
-- =============================================

-- User-Profile (erweitert Supabase Auth)
create table profiles (
  id uuid references auth.users primary key,
  role text check (role in ('adoptant', 'tierhalter', 'tierheim')) not null,
  name text,
  avatar_url text,
  plz text,
  city text,
  lat float,
  lng float,
  created_at timestamptz default now()
);

-- Adoptant-spezifische Daten
create table adoptant_profiles (
  id uuid references profiles primary key,
  wohnsituation text check (wohnsituation in ('wohnung', 'haus', 'haus_mit_garten', 'bauernhof')),
  erfahrung text check (erfahrung in ('anfaenger', 'fortgeschritten', 'profi')),
  kinder_im_haushalt boolean default false,
  kinder_alter text,
  andere_tiere boolean default false,
  aktivitaetslevel text check (aktivitaetslevel in ('sportlich', 'mittel', 'ruhig')),
  arbeitszeit text check (arbeitszeit in ('vollzeit', 'teilzeit', 'homeoffice', 'nicht_berufstaetig'))
);

-- Tierheim-Profile
create table shelter_profiles (
  id uuid references profiles primary key,
  org_name text not null,
  adresse text,
  telefon text,
  website text,
  beschreibung text,
  logo_url text,
  verifiziert boolean default false
);

-- Tier-Profile (von Tierheimen angelegt)
create table pets (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid references profiles not null,
  name text not null,
  tierart text check (tierart in ('hund', 'katze')) not null,
  rasse text,
  groesse_kategorie text check (groesse_kategorie in ('klein', 'mittel', 'gross', 'riese')),
  alter_jahre int,
  alter_monate int,
  geschlecht text check (geschlecht in ('maennlich', 'weiblich')),
  kastriert boolean default false,
  charakter_tags text[] default '{}',
  braucht_garten boolean default false,
  kinderfreundlich text check (kinderfreundlich in ('ja', 'nein', 'ab_schulalter', 'ab_teenager')),
  vertraeglich_mit_tieren boolean default true,
  erfahrung_benoetigt text check (erfahrung_benoetigt in ('anfaenger', 'fortgeschritten', 'profi')),
  aktivitaetslevel text check (aktivitaetslevel in ('sportlich', 'mittel', 'ruhig')),
  herkunft text,
  im_heim_seit date,
  beschreibung text,
  status text check (status in ('verfuegbar', 'reserviert', 'vermittelt')) default 'verfuegbar',
  created_at timestamptz default now()
);

-- Tier-Fotos (mehrere pro Tier)
create table pet_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets on delete cascade,
  url text not null,
  position int default 0
);

-- Tierhalter-eigene Tiere
create table owner_pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles not null,
  name text not null,
  tierart text check (tierart in ('hund', 'katze')) default 'hund',
  rasse text,
  groesse_kategorie text check (groesse_kategorie in ('klein', 'mittel', 'gross', 'riese')),
  alter_jahre int,
  kinderfreundlich boolean default true,
  vertraeglich_mit_tieren boolean default true,
  aktivitaetslevel text check (aktivitaetslevel in ('sportlich', 'mittel', 'ruhig')),
  foto_url text,
  created_at timestamptz default now()
);

-- Adoption-Swipes (Adoptant → Tier)
create table adoption_swipes (
  id uuid primary key default gen_random_uuid(),
  adoptant_id uuid references profiles not null,
  pet_id uuid references pets not null,
  richtung text check (richtung in ('ja', 'nein')) not null,
  warnung_ignoriert boolean default false,
  created_at timestamptz default now(),
  unique(adoptant_id, pet_id)
);

-- Adoption-Matches
create table adoption_matches (
  id uuid primary key default gen_random_uuid(),
  adoptant_id uuid references profiles not null,
  pet_id uuid references pets not null,
  shelter_id uuid references profiles not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamptz default now()
);

-- Tierhalter-Swipes (gegenseitig)
create table owner_swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_id uuid references profiles not null,
  swiper_pet_id uuid references owner_pets not null,
  target_id uuid references profiles not null,
  target_pet_id uuid references owner_pets not null,
  richtung text check (richtung in ('ja', 'nein')) not null,
  modus text check (modus in ('gassi', 'spieldate')) not null,
  created_at timestamptz default now(),
  unique(swiper_id, target_pet_id)
);

-- Tierhalter-Matches (nur wenn beide gelikt haben)
create table owner_matches (
  id uuid primary key default gen_random_uuid(),
  pet_a_id uuid references owner_pets not null,
  pet_b_id uuid references owner_pets not null,
  owner_a_id uuid references profiles not null,
  owner_b_id uuid references profiles not null,
  modus text check (modus in ('gassi', 'spieldate')) not null,
  created_at timestamptz default now()
);

-- Chat-Nachrichten (für beide Match-Typen)
create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  match_type text check (match_type in ('adoption', 'owner')) not null,
  sender_id uuid references profiles not null,
  text text,
  foto_url text,
  created_at timestamptz default now()
);

-- Push Tokens
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles not null,
  token text not null,
  created_at timestamptz default now()
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

alter table profiles enable row level security;
alter table adoptant_profiles enable row level security;
alter table shelter_profiles enable row level security;
alter table pets enable row level security;
alter table pet_photos enable row level security;
alter table owner_pets enable row level security;
alter table adoption_swipes enable row level security;
alter table adoption_matches enable row level security;
alter table owner_swipes enable row level security;
alter table owner_matches enable row level security;
alter table messages enable row level security;
alter table push_tokens enable row level security;

-- profiles: jeder liest eigenes, schreibt nur eigenes
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- profiles: andere können öffentliche Infos lesen (für Match-Anzeige)
create policy "profiles_select_public" on profiles
  for select using (true);

-- adoptant_profiles
create policy "adoptant_profiles_own" on adoptant_profiles
  for all using (auth.uid() = id);

-- shelter_profiles
create policy "shelter_profiles_select_all" on shelter_profiles
  for select using (true);

create policy "shelter_profiles_manage_own" on shelter_profiles
  for all using (auth.uid() = id);

-- pets: alle können verfügbare Tiere sehen
create policy "pets_select_available" on pets
  for select using (status = 'verfuegbar' or shelter_id = auth.uid());

create policy "pets_manage_own" on pets
  for all using (auth.uid() = shelter_id);

-- pet_photos: alle können sehen, nur Tierheim schreibt
create policy "pet_photos_select_all" on pet_photos
  for select using (true);

create policy "pet_photos_manage_via_pet" on pet_photos
  for all using (
    exists (
      select 1 from pets where pets.id = pet_photos.pet_id and pets.shelter_id = auth.uid()
    )
  );

-- owner_pets: alle können sehen (für Matching)
create policy "owner_pets_select_all" on owner_pets
  for select using (true);

create policy "owner_pets_manage_own" on owner_pets
  for all using (auth.uid() = owner_id);

-- adoption_swipes: nur eigene
create policy "adoption_swipes_own" on adoption_swipes
  for all using (auth.uid() = adoptant_id);

-- adoption_matches: Adoptant + Tierheim
create policy "adoption_matches_participants" on adoption_matches
  for select using (auth.uid() = adoptant_id or auth.uid() = shelter_id);

create policy "adoption_matches_insert_adoptant" on adoption_matches
  for insert with check (auth.uid() = adoptant_id);

create policy "adoption_matches_update_shelter" on adoption_matches
  for update using (auth.uid() = shelter_id);

-- owner_swipes
create policy "owner_swipes_own" on owner_swipes
  for all using (auth.uid() = swiper_id);

-- owner_matches: beide Owner
create policy "owner_matches_participants" on owner_matches
  for select using (auth.uid() = owner_a_id or auth.uid() = owner_b_id);

create policy "owner_matches_insert" on owner_matches
  for insert with check (auth.uid() = owner_a_id or auth.uid() = owner_b_id);

-- messages: nur Match-Teilnehmer
create policy "messages_adoption_participants" on messages
  for select using (
    match_type = 'adoption' and exists (
      select 1 from adoption_matches
      where adoption_matches.id = messages.match_id
      and (adoption_matches.adoptant_id = auth.uid() or adoption_matches.shelter_id = auth.uid())
    )
  );

create policy "messages_owner_participants" on messages
  for select using (
    match_type = 'owner' and exists (
      select 1 from owner_matches
      where owner_matches.id = messages.match_id
      and (owner_matches.owner_a_id = auth.uid() or owner_matches.owner_b_id = auth.uid())
    )
  );

create policy "messages_insert_own" on messages
  for insert with check (auth.uid() = sender_id);

-- push_tokens: nur eigene
create policy "push_tokens_own" on push_tokens
  for all using (auth.uid() = user_id);

-- =============================================
-- Storage Buckets (run these in Supabase dashboard)
-- =============================================
-- insert into storage.buckets (id, name, public) values ('pet-photos', 'pet-photos', true);
-- insert into storage.buckets (id, name, public) values ('chat-photos', 'chat-photos', false);
-- insert into storage.buckets (id, name, public) values ('logos', 'logos', true);
