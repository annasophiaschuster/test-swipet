-- ═══════════════════════════════════════════════════════════════════════════
-- SWIPET — pets Tabelle erweitern + 8 Dummy-Hunde einfügen
-- Ausführen in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Neue Spalten hinzufügen ───────────────────────────────────────────────
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS gewicht          text,
  ADD COLUMN IF NOT EXISTS fell_typ         text,
  ADD COLUMN IF NOT EXISTS fell_farbe       text,
  ADD COLUMN IF NOT EXISTS hund_vertraeglich     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS katze_vertraeglich    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS kleintier_vertraeglich boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stubenrein       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS leinenfuehrig    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS maulkorbpflicht  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS alleine_bleiben  text,
  ADD COLUMN IF NOT EXISTS geimpft          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gechipt          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS entwurmt         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS erkrankungen     text;

-- ── 2. Bestehende Testdaten löschen (nur für info@swipet.de) ────────────────
DELETE FROM pet_photos
 WHERE pet_id IN (
   SELECT p.id FROM pets p
   JOIN auth.users u ON u.id = p.shelter_id
   WHERE u.email = 'info@swipet.de'
 );

DELETE FROM pets
 WHERE shelter_id = (SELECT id FROM auth.users WHERE email = 'info@swipet.de');

-- ── 3. 8 Hunde einfügen ─────────────────────────────────────────────────────
INSERT INTO pets (
  shelter_id, tierart, name, rasse,
  groesse_kategorie, alter_jahre, alter_monate, geschlecht,
  gewicht, herkunft, fell_typ, fell_farbe,
  kastriert, geimpft, gechipt, entwurmt, erkrankungen,
  hund_vertraeglich, katze_vertraeglich, kleintier_vertraeglich,
  stubenrein, leinenfuehrig, maulkorbpflicht,
  braucht_garten, alleine_bleiben, vertraeglich_mit_tieren,
  charakter_tags, kinderfreundlich, aktivitaetslevel, erfahrung_benoetigt,
  beschreibung, status
)
SELECT
  u.id, 'hund', v.name, v.rasse,
  v.groesse_kategorie, v.alter_jahre, 0, v.geschlecht,
  v.gewicht, v.herkunft, v.fell_typ, v.fell_farbe,
  v.kastriert, v.geimpft, v.gechipt, v.entwurmt, v.erkrankungen,
  v.hund_vertraeglich, v.katze_vertraeglich, v.kleintier_vertraeglich,
  v.stubenrein, v.leinenfuehrig, v.maulkorbpflicht,
  v.braucht_garten, v.alleine_bleiben, v.vertraeglich_mit_tieren,
  v.charakter_tags, v.kinderfreundlich, v.aktivitaetslevel, v.erfahrung_benoetigt,
  v.beschreibung, 'verfuegbar'
FROM auth.users u
CROSS JOIN (VALUES

  -- Atan
  (
    'Atan', 'Deutscher Schäferhund',
    'gross', 3, 'maennlich',
    '32', 'abgabetier', 'kurz', 'schwarz-braun',
    true, true, true, true, null::text,
    false, false, false,
    true, true, false,
    true, 'bis_4h', false,
    ARRAY['treu','selbstständig','vorsichtig mit Fremden'],
    'ab_teenager', 'sportlich', 'fortgeschritten',
    'Atan ist ein treuer und aufmerksamer Schäferhund, der eine erfahrene Hand braucht. Er liebt lange Spaziergänge und hat einen starken Schutztrieb. Mit der richtigen Führung ist er ein absolut loyaler Begleiter.'
  ),

  -- Zeus
  (
    'Zeus', 'Zwergpudel',
    'klein', 2, 'maennlich',
    '5', 'abgabetier', 'lockig', 'apricot',
    false, true, true, true, null::text,
    true, true, true,
    true, true, false,
    false, 'bis_2h', true,
    ARRAY['verspielt','verschmust','lernfreudig','energetisch'],
    'ja', 'mittel', 'anfaenger',
    'Zeus ist ein aufgeweckter kleiner Pudel, der jeden Raum mit Energie füllt. Er lernt schnell, liebt Menschen und ist der perfekte erste Hund für eine aktive Familie.'
  ),

  -- Cookie
  (
    'Cookie', 'Australian Shepherd',
    'mittel', 1, 'weiblich',
    '18', 'fundtier', 'mittel', 'schwarz-weiß-braun',
    false, true, false, true, null::text,
    true, false, false,
    false, false, false,
    true, 'nicht_moeglich', true,
    ARRAY['verspielt','energetisch','neugierig','lernfreudig'],
    'ab_schulalter', 'sportlich', 'fortgeschritten',
    'Cookie wurde als Fundtier abgegeben und ist noch ganz am Anfang ihrer Reise. Sie ist voller Energie und Neugier, braucht aber konsequente Erziehung und viel Auslauf. Ein echter Geheimtipp für aktive Menschen.'
  ),

  -- Rocky
  (
    'Rocky', 'Französische Bulldogge',
    'klein', 4, 'maennlich',
    '12', 'abgabetier', 'kurz', 'gestromt',
    true, true, true, true, 'Atemprobleme rassetypisch'::text,
    true, true, false,
    true, true, false,
    false, 'bis_4h', true,
    ARRAY['verschmust','ruhig','anhänglich','familienfreundlich'],
    'ja', 'ruhig', 'anfaenger',
    'Rocky ist ein gemütlicher Charmeur, der am liebsten auf dem Sofa liegt und gekuschelt wird. Ideal für Stadtleben und Familien. Seine rassetypischen Atemgeräusche sind bekannt und werden regelmäßig kontrolliert.'
  ),

  -- Milo
  (
    'Milo', 'Labrador Retriever',
    'gross', 2, 'maennlich',
    '30', 'abgabetier', 'kurz', 'schwarz',
    false, true, true, true, null::text,
    true, true, false,
    true, false, false,
    true, 'bis_2h', true,
    ARRAY['verspielt','verschmust','familienfreundlich','energetisch'],
    'ja', 'sportlich', 'anfaenger',
    'Milo ist der klassische Familienfreund — immer gut gelaunt, immer dabei. Er liebt Wasser, Bälle und Menschen aller Art. An der Leine braucht er noch etwas Training, aber sein Herz ist am richtigen Fleck.'
  ),

  -- Bella
  (
    'Bella', 'Chihuahua',
    'klein', 5, 'weiblich',
    '3', 'abgabetier', 'lang', 'hellbraun',
    true, true, true, true, null::text,
    false, false, false,
    true, true, false,
    false, 'bis_4h', false,
    ARRAY['treu','anhänglich','vorsichtig mit Fremden','dominant'],
    'nein', 'ruhig', 'fortgeschritten',
    'Bella ist eine kleine Diva mit großem Herzen — für ihre Person. Fremden gegenüber ist sie reserviert und mag keine anderen Tiere. Sie sucht ein ruhiges Zuhause als Einzelhund bei einer erwachsenen Person.'
  ),

  -- Bruno
  (
    'Bruno', 'Golden Retriever',
    'gross', 3, 'maennlich',
    '34', 'auslandsrettung', 'lang', 'goldgelb',
    true, true, true, true, null::text,
    true, true, true,
    true, true, false,
    true, 'bis_4h', true,
    ARRAY['verschmust','familienfreundlich','treu','neugierig'],
    'ja', 'mittel', 'anfaenger',
    'Bruno kam aus dem Ausland zu uns und hat sich blitzschnell eingelebt. Er versteht sich mit allen — Menschen, Hunden, Katzen. Ein unkomplizierter, liebevoller Hund der in fast jede Familie passt.'
  ),

  -- Kira
  (
    'Kira', 'Siberian Husky',
    'gross', 4, 'weiblich',
    '22', 'beschlagnahmt', 'mittel', 'grau-weiß',
    false, true, false, true, null::text,
    true, false, false,
    true, false, false,
    true, 'nicht_moeglich', true,
    ARRAY['energetisch','selbstständig','verspielt','neugierig'],
    'ab_teenager', 'sportlich', 'profi',
    'Kira wurde unter schwierigen Umständen sichergestellt und braucht Zeit und Vertrauen. Sie ist intelligent und hat viel Energie — ideal für erfahrene Hundemenschen die ihr ein stabiles, aktives Zuhause geben können.'
  )

) AS v(
  name, rasse,
  groesse_kategorie, alter_jahre, geschlecht,
  gewicht, herkunft, fell_typ, fell_farbe,
  kastriert, geimpft, gechipt, entwurmt, erkrankungen,
  hund_vertraeglich, katze_vertraeglich, kleintier_vertraeglich,
  stubenrein, leinenfuehrig, maulkorbpflicht,
  braucht_garten, alleine_bleiben, vertraeglich_mit_tieren,
  charakter_tags, kinderfreundlich, aktivitaetslevel, erfahrung_benoetigt,
  beschreibung
)
WHERE u.email = 'info@swipet.de';
