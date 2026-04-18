-- ═══════════════════════════════════════════════════════════════════════════
-- SWIPET — Dummy-Adoptanten, Anfragen & Nachrichten
-- Ausführen in: Supabase Dashboard → SQL Editor → New Query → Run
-- WICHTIG: Zuerst add_pet_columns_and_seed.sql ausführen!
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Alte Dummy-Daten aufräumen ────────────────────────────────────────────
DELETE FROM messages
 WHERE match_id IN (
   SELECT am.id FROM adoption_matches am
   JOIN auth.users u ON u.id = am.shelter_id
   WHERE u.email = 'info@swipet.de'
 );

DELETE FROM adoption_matches
 WHERE shelter_id = (SELECT id FROM auth.users WHERE email = 'info@swipet.de');

-- Alte Dummy-Adoptanten löschen (erkennbar an @dummy.swipet.de)
DELETE FROM adoption_swipes
 WHERE adoptant_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@dummy.swipet.de'
 );
DELETE FROM profiles
 WHERE id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@dummy.swipet.de'
 );
DELETE FROM auth.users WHERE email LIKE '%@dummy.swipet.de';

-- ── 1. Dummy-Adoptanten in auth.users anlegen ────────────────────────────────
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'anna.mueller@dummy.swipet.de', crypt('Test1234!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false),

  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'max.schmidt@dummy.swipet.de', crypt('Test1234!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false),

  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'lisa.weber@dummy.swipet.de', crypt('Test1234!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false),

  ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'tom.fischer@dummy.swipet.de', crypt('Test1234!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false),

  ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'sarah.koch@dummy.swipet.de', crypt('Test1234!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false),

  ('a1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'jan.becker@dummy.swipet.de', crypt('Test1234!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false);

-- ── 2. Profile für die Adoptanten ───────────────────────────────────────────
INSERT INTO profiles (id, role, name, city) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'adoptant', 'Anna Müller',   'Berlin'),
  ('a1000000-0000-0000-0000-000000000002', 'adoptant', 'Max Schmidt',   'München'),
  ('a1000000-0000-0000-0000-000000000003', 'adoptant', 'Lisa Weber',    'Hamburg'),
  ('a1000000-0000-0000-0000-000000000004', 'adoptant', 'Tom Fischer',   'Frankfurt'),
  ('a1000000-0000-0000-0000-000000000005', 'adoptant', 'Sarah Koch',    'Köln'),
  ('a1000000-0000-0000-0000-000000000006', 'adoptant', 'Jan Becker',    'Stuttgart');

-- ── 3. Anfragen (adoption_matches) anlegen ───────────────────────────────────
-- Wir referenzieren Hunde über Subquery nach Name + shelter_id

DO $$
DECLARE
  sid   uuid := (SELECT id FROM auth.users WHERE email = 'info@swipet.de');
  a1    uuid := 'a1000000-0000-0000-0000-000000000001'; -- Anna
  a2    uuid := 'a1000000-0000-0000-0000-000000000002'; -- Max
  a3    uuid := 'a1000000-0000-0000-0000-000000000003'; -- Lisa
  a4    uuid := 'a1000000-0000-0000-0000-000000000004'; -- Tom
  a5    uuid := 'a1000000-0000-0000-0000-000000000005'; -- Sarah
  a6    uuid := 'a1000000-0000-0000-0000-000000000006'; -- Jan

  p_atan   uuid := (SELECT id FROM pets WHERE name='Atan'   AND shelter_id=sid);
  p_zeus   uuid := (SELECT id FROM pets WHERE name='Zeus'   AND shelter_id=sid);
  p_cookie uuid := (SELECT id FROM pets WHERE name='Cookie' AND shelter_id=sid);
  p_rocky  uuid := (SELECT id FROM pets WHERE name='Rocky'  AND shelter_id=sid);
  p_milo   uuid := (SELECT id FROM pets WHERE name='Milo'   AND shelter_id=sid);
  p_bella  uuid := (SELECT id FROM pets WHERE name='Bella'  AND shelter_id=sid);
  p_bruno  uuid := (SELECT id FROM pets WHERE name='Bruno'  AND shelter_id=sid);
  p_kira   uuid := (SELECT id FROM pets WHERE name='Kira'   AND shelter_id=sid);

  m1  uuid; m2  uuid; m3  uuid; m4  uuid; m5  uuid;
  m6  uuid; m7  uuid; m8  uuid; m9  uuid; m10 uuid;
  m11 uuid; m12 uuid; m13 uuid;
BEGIN

  -- ── ATAN: 1 accepted (Anna), 1 pending (Max), 1 rejected (Lisa) ──
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a1, p_atan, sid, 'accepted', now() - interval '5 days') RETURNING id INTO m1;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a2, p_atan, sid, 'pending',  now() - interval '2 days');
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a3, p_atan, sid, 'rejected', now() - interval '7 days');

  -- ── ZEUS: 1 accepted (Max), 1 accepted (Lisa), 2 pending ──
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a2, p_zeus, sid, 'accepted', now() - interval '3 days') RETURNING id INTO m2;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a3, p_zeus, sid, 'accepted', now() - interval '1 day')  RETURNING id INTO m3;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a4, p_zeus, sid, 'pending',  now() - interval '4 days');
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a5, p_zeus, sid, 'pending',  now() - interval '1 day');

  -- ── COOKIE: 1 accepted (Tom), 2 pending ──
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a4, p_cookie, sid, 'accepted', now() - interval '2 days') RETURNING id INTO m4;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a1, p_cookie, sid, 'pending',  now() - interval '6 days');
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a6, p_cookie, sid, 'pending',  now() - interval '1 day');

  -- ── ROCKY: 2 accepted (Sarah, Jan), 1 pending ──
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a5, p_rocky, sid, 'accepted', now() - interval '4 days') RETURNING id INTO m5;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a6, p_rocky, sid, 'accepted', now() - interval '2 days') RETURNING id INTO m6;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a2, p_rocky, sid, 'pending',  now() - interval '3 days');

  -- ── MILO: 1 accepted (Anna), 2 pending ──
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a1, p_milo, sid, 'accepted', now() - interval '1 day')   RETURNING id INTO m7;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a3, p_milo, sid, 'pending',  now() - interval '3 days');
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a4, p_milo, sid, 'pending',  now() - interval '5 days');

  -- ── BELLA: 1 accepted (Lisa), 1 pending, 1 rejected ──
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a3, p_bella, sid, 'accepted', now() - interval '6 days') RETURNING id INTO m8;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a5, p_bella, sid, 'pending',  now() - interval '2 days');
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a2, p_bella, sid, 'rejected', now() - interval '8 days');

  -- ── BRUNO: 2 accepted (Jan, Tom), 1 pending ──
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a6, p_bruno, sid, 'accepted', now() - interval '3 days') RETURNING id INTO m9;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a4, p_bruno, sid, 'accepted', now() - interval '1 day')  RETURNING id INTO m10;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a1, p_bruno, sid, 'pending',  now() - interval '4 days');

  -- ── KIRA: 1 accepted (Sarah), 1 pending ──
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a5, p_kira, sid, 'accepted', now() - interval '2 days') RETURNING id INTO m11;
  INSERT INTO adoption_matches (adoptant_id, pet_id, shelter_id, status, created_at)
    VALUES (a6, p_kira, sid, 'pending',  now() - interval '5 days');

  -- ──────────────────────────────────────────────────────────────────────────
  -- 4. Nachrichten für accepted matches
  -- ──────────────────────────────────────────────────────────────────────────

  -- m1: Atan ↔ Anna
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m1, 'adoption', a1,  'Hallo! Ich interessiere mich sehr für Atan. Wäre ein Besuch möglich?',         now() - interval '5 days' + interval '2 hours'),
    (m1, 'adoption', sid, 'Hallo Anna! Natürlich, wir freuen uns sehr über dein Interesse. Wie wäre es diesen Samstag?', now() - interval '4 days'),
    (m1, 'adoption', a1,  'Samstag passt super! Um welche Uhrzeit?',                                       now() - interval '3 days' + interval '1 hour'),
    (m1, 'adoption', sid, 'Wie wäre es um 11 Uhr? Wir sind ab 10 Uhr geöffnet.',                          now() - interval '3 days' + interval '3 hours'),
    (m1, 'adoption', a1,  'Perfekt, ich freue mich! Soll ich etwas mitbringen?',                           now() - interval '2 days');

  -- m2: Zeus ↔ Max
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m2, 'adoption', a2,  'Hallo, Zeus sieht auf den Fotos so süß aus. Wir haben zwei Kinder, ist er wirklich kinderfreundlich?', now() - interval '3 days'),
    (m2, 'adoption', sid, 'Ja absolut! Zeus liebt Kinder und ist sehr geduldig. Ein tolles Match für eure Familie!', now() - interval '2 days' + interval '4 hours'),
    (m2, 'adoption', a2,  'Das klingt wunderbar. Können wir ihn nächste Woche besuchen kommen?',            now() - interval '1 day' + interval '2 hours'),
    (m2, 'adoption', sid, 'Sehr gerne! Schreibt uns einfach kurz welcher Tag euch passt.',                  now() - interval '20 hours');

  -- m3: Zeus ↔ Lisa
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m3, 'adoption', a3,  'Ich lebe alleine und arbeite von zuhause. Zeus wäre mein erster Hund.',          now() - interval '1 day'),
    (m3, 'adoption', sid, 'Das klingt nach einer idealen Situation für Zeus! Er braucht viel Aufmerksamkeit.', now() - interval '18 hours'),
    (m3, 'adoption', a3,  'Ich würde ihn gerne mal kennenlernen. Wann habt ihr Zeit?',                      now() - interval '8 hours');

  -- m4: Cookie ↔ Tom
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m4, 'adoption', a4,  'Cookie passt perfekt zu uns! Wir haben einen großen Garten und viel Zeit.',      now() - interval '2 days'),
    (m4, 'adoption', sid, 'Das freut uns sehr! Cookie braucht wirklich viel Auslauf und Beschäftigung.',    now() - interval '1 day' + interval '6 hours'),
    (m4, 'adoption', a4,  'Wir haben schon Erfahrung mit Aussies. Können wir sie kennenlernen?',            now() - interval '12 hours'),
    (m4, 'adoption', sid, 'Sehr gerne! Kommt doch diesen Freitag vorbei.',                                  now() - interval '6 hours'),
    (m4, 'adoption', a4,  'Freitag ist super, wir kommen um 14 Uhr!',                                       now() - interval '2 hours');

  -- m5: Rocky ↔ Sarah
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m5, 'adoption', a5,  'Rocky ist so ein Schatz! Wir leben in einer Wohnung in Köln, reicht das?',       now() - interval '4 days'),
    (m5, 'adoption', sid, 'Rocky ist absolut wohnungstauglich! Er braucht keine großen Flächen.',           now() - interval '3 days' + interval '2 hours'),
    (m5, 'adoption', a5,  'Perfekt! Mein Mann und ich würden ihn so gerne kennenlernen.',                   now() - interval '2 days'),
    (m5, 'adoption', sid, 'Kein Problem! Wie wäre nächster Mittwoch?',                                      now() - interval '1 day'),
    (m5, 'adoption', a5,  'Mittwoch klappt wunderbar. Um wie viel Uhr?',                                    now() - interval '4 hours');

  -- m6: Rocky ↔ Jan
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m6, 'adoption', a6,  'Ich suche schon lange nach einer Französischen Bulldogge. Ist Rocky noch zu haben?', now() - interval '2 days'),
    (m6, 'adoption', sid, 'Ja! Rocky hat noch kein festes Zuhause gefunden. Erzähl uns ein bisschen über dich.', now() - interval '1 day' + interval '5 hours'),
    (m6, 'adoption', a6,  'Ich bin 35, Single und arbeite von zu Hause. Rocky wäre mein einziges Tier.',    now() - interval '18 hours'),
    (m6, 'adoption', sid, 'Das klingt perfekt für Rocky! Möchtest du ihn besuchen kommen?',                 now() - interval '10 hours');

  -- m7: Milo ↔ Anna
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m7, 'adoption', a1,  'Ich habe schon einen Hund zuhause — versteht sich Milo mit anderen Hunden?',     now() - interval '1 day'),
    (m7, 'adoption', sid, 'Milo ist sehr sozial! Er liebt andere Hunde. Das könnte wunderbar passen.',      now() - interval '20 hours'),
    (m7, 'adoption', a1,  'Super! Könnten wir einen gemeinsamen Spaziergang machen damit sie sich kennenlernen?', now() - interval '8 hours'),
    (m7, 'adoption', sid, 'Was für eine tolle Idee! Das machen wir gerne. Wann habt ihr Zeit?',             now() - interval '3 hours');

  -- m8: Bella ↔ Lisa
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m8, 'adoption', a3,  'Bella klingt wie das perfekte Match für mich. Ich lebe alleine und habe viel Zeit.', now() - interval '6 days'),
    (m8, 'adoption', sid, 'Bella sucht wirklich genau so jemanden! Sie braucht eine ruhige Einzelperson.',  now() - interval '5 days' + interval '3 hours'),
    (m8, 'adoption', a3,  'Ich komme gerne vorbei. Soll ich Leckerlis mitbringen?',                         now() - interval '4 days'),
    (m8, 'adoption', sid, 'Liebend gerne! Bella liebt Leckerlis. Sie ist am Anfang etwas schüchtern, aber warm sehr schnell auf.', now() - interval '3 days'),
    (m8, 'adoption', a3,  'Kein Problem, ich habe Geduld. Bis Samstag dann!',                               now() - interval '2 days');

  -- m9: Bruno ↔ Jan
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m9, 'adoption', a6,  'Bruno sieht so lieb aus! Wir haben eine Familie mit 2 Kindern und einem Garten.', now() - interval '3 days'),
    (m9, 'adoption', sid, 'Bruno liebt Kinder und wäre bei euch sicher im 7. Himmel!',                      now() - interval '2 days' + interval '4 hours'),
    (m9, 'adoption', a6,  'Unsere Kinder sind 6 und 9 Jahre alt. Passt das?',                               now() - interval '1 day' + interval '6 hours'),
    (m9, 'adoption', sid, 'Perfekt! Bruno ist sehr sanft mit Kindern. Wollt ihr ihn besuchen kommen?',      now() - interval '18 hours'),
    (m9, 'adoption', a6,  'Ja unbedingt! Wie wäre dieses Wochenende?',                                      now() - interval '6 hours');

  -- m10: Bruno ↔ Tom
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m10, 'adoption', a4,  'Hallo! Bruno sieht nach dem perfekten Familienhund aus.',                        now() - interval '1 day'),
    (m10, 'adoption', sid, 'Hallo Tom! Bruno ist wirklich ein Traumhund. Erzähl uns mehr über eure Situation.', now() - interval '20 hours'),
    (m10, 'adoption', a4,  'Wir haben einen Garten, keine anderen Tiere und ich bin viel zuhause.',          now() - interval '12 hours');

  -- m11: Kira ↔ Sarah
  INSERT INTO messages (match_id, match_type, sender_id, text, created_at) VALUES
    (m11, 'adoption', a5,  'Kira fasziniert mich sehr. Ich habe Erfahrung mit Huskys und einen großen Garten.', now() - interval '2 days'),
    (m11, 'adoption', sid, 'Das ist wunderbar! Kira braucht wirklich erfahrene Hände. Erzähl uns mehr.',    now() - interval '1 day' + interval '8 hours'),
    (m11, 'adoption', a5,  'Ich hatte 8 Jahre lang einen Husky. Kira würde bei mir sehr viel Auslauf bekommen.', now() - interval '22 hours'),
    (m11, 'adoption', sid, 'Das klingt ideal! Möchtest du Kira kennenlernen?',                               now() - interval '14 hours'),
    (m11, 'adoption', a5,  'Sehr gerne! Ich bin sehr gespannt auf sie.',                                     now() - interval '4 hours');

END $$;
