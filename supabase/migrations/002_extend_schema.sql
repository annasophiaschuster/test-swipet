-- Migration 002: Extend schema for walks, adoption_anfragen, new profile fields
-- Applied: 2026-04-13

-- profiles: neue Felder
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS erfahrung_mit_hund  text,
  ADD COLUMN IF NOT EXISTS wohnsituation        text,
  ADD COLUMN IF NOT EXISTS wohnlage             text,
  ADD COLUMN IF NOT EXISTS kurze_introduction   text;

-- pets: fehlende Felder
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS charakter     text,
  ADD COLUMN IF NOT EXISTS fotos         text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interne_notiz text;

-- owner_pets: fehlende Felder
ALTER TABLE owner_pets
  ADD COLUMN IF NOT EXISTS charakter       text,
  ADD COLUMN IF NOT EXISTS leinenverhalten text;

-- walks
CREATE TABLE IF NOT EXISTS walks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ersteller_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ort               text NOT NULL,
  treffpunkt        text,
  datum             date NOT NULL,
  uhrzeit           time NOT NULL,
  dauer_minuten     int,
  max_teilnehmer    int NOT NULL DEFAULT 10,
  hunde_groesse     text,
  aktivitaetslevel  text,
  persoenlicher_text text,
  created_at        timestamptz DEFAULT now()
);

-- walk_teilnehmer
CREATE TABLE IF NOT EXISTS walk_teilnehmer (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id   uuid NOT NULL REFERENCES walks(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status    text NOT NULL DEFAULT 'angefragt'
             CHECK (status IN ('angefragt','angenommen','abgelehnt','verlassen')),
  UNIQUE (walk_id, user_id)
);

-- adoption_anfragen
CREATE TABLE IF NOT EXISTS adoption_anfragen (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hund_id        uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  interessent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'neu'
                  CHECK (status IN ('neu','in_pruefung','angenommen','abgelehnt')),
  notiz_intern   text,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (hund_id, interessent_id)
);
