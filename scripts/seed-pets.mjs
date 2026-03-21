/**
 * Seed script: Creates a test shelter + 5 mock pets in Supabase
 * Run with: node scripts/seed-pets.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rdkxfctjdwsyvzbzsxsd.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJka3hmY3RqZHdzeXZ6YnpzeHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMzg2MzIsImV4cCI6MjA4OTYxNDYzMn0.m_qa1jJ9LTZNA3lxR4lXqm3zerx9QVQRhmW6Z_0YzOE';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJka3hmY3RqZHdzeXZ6YnpzeHNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAzODYzMiwiZXhwIjoyMDg5NjE0NjMyfQ.tXCousSKWs2oywEZFRfrOIsFx_O7wz10CgRTvMrkhNg';

// Admin client bypasses RLS
const supabase = createClient(SUPABASE_URL, ANON_KEY);
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SHELTER_EMAIL = 'testtierheim@gmail.com';
const SHELTER_PASSWORD = 'Swipet1234!';

async function run() {
  console.log('🐾 Swipet Seed Script\n');

  // 1. Find or create test shelter user via admin API
  const TEST_USER_ID = 'a52b716f-4236-4a25-ac47-2bc618963184';
  let shelterId;

  console.log('1. Email-Bestätigung via Admin API...');
  const { error: confirmError } = await admin.auth.admin.updateUserById(TEST_USER_ID, {
    email_confirm: true,
  });
  if (confirmError) {
    console.log('   Confirm error:', confirmError.message);
  } else {
    console.log('   ✅ Email bestätigt');
  }
  shelterId = TEST_USER_ID;

  // 2. Create profile (via admin to bypass RLS)
  console.log('\n2. Profil anlegen...');
  const { error: profileError } = await admin.from('profiles').upsert({
    id: shelterId,
    role: 'tierheim',
    name: 'Tierheim München Testdaten',
    city: 'München',
  });
  if (profileError) console.log('   Profile error:', profileError.message);
  else console.log('   ✅ Profil angelegt');

  // 3. Create shelter profile
  console.log('\n3. Tierheim-Profil anlegen...');
  const { error: shelterError } = await admin.from('shelter_profiles').upsert({
    id: shelterId,
    org_name: 'Tierheim München (Test)',
    adresse: 'Teststraße 1, 80333 München',
    telefon: '+49 89 12345678',
    beschreibung: 'Test-Tierheim für Entwicklungszwecke',
    verifiziert: true,
  });
  if (shelterError) console.log('   Shelter error:', shelterError.message);
  else console.log('   ✅ Tierheim-Profil angelegt');

  await insertPets(shelterId);
}

async function insertPets(shelterId) {
  // 4. Insert 5 mock pets
  console.log('\n4. Mock-Tiere einfügen...');

  const mockPets = [
    {
      shelter_id: shelterId,
      name: 'Luna',
      tierart: 'hund',
      rasse: 'Labrador Mix',
      alter_jahre: 2,
      alter_monate: 0,
      groesse_kategorie: 'gross',
      geschlecht: 'weiblich',
      beschreibung: 'Luna ist eine fröhliche und energiegeladene Hündin, die ihre neue Familie mit Liebe überhäuft.',
      charakter_tags: ['verspielt', 'energiegeladen', 'treu'],
      braucht_garten: true,
      kinderfreundlich: 'ja',
      vertraeglich_mit_tieren: true,
      erfahrung_benoetigt: 'anfaenger',
      aktivitaetslevel: 'sportlich',
      status: 'verfuegbar',
    },
    {
      shelter_id: shelterId,
      name: 'Milo',
      tierart: 'katze',
      rasse: 'Europäisch Kurzhaar',
      alter_jahre: 4,
      alter_monate: 6,
      groesse_kategorie: 'mittel',
      geschlecht: 'maennlich',
      beschreibung: 'Milo ist ein ruhiger, verschmuster Kater, der am liebsten auf dem Sofa kuschelt.',
      charakter_tags: ['ruhig', 'verschmust', 'sanft'],
      braucht_garten: false,
      kinderfreundlich: 'ab_schulalter',
      vertraeglich_mit_tieren: false,
      erfahrung_benoetigt: 'anfaenger',
      aktivitaetslevel: 'ruhig',
      status: 'verfuegbar',
    },
    {
      shelter_id: shelterId,
      name: 'Rocky',
      tierart: 'hund',
      rasse: 'Schäferhund Mix',
      alter_jahre: 5,
      alter_monate: 3,
      groesse_kategorie: 'gross',
      geschlecht: 'maennlich',
      beschreibung: 'Rocky sucht erfahrene Hundehalter. Er ist intelligent, loyal und braucht viel Auslauf.',
      charakter_tags: ['mutig', 'treu', 'neugierig'],
      braucht_garten: true,
      kinderfreundlich: 'nein',
      vertraeglich_mit_tieren: false,
      erfahrung_benoetigt: 'profi',
      aktivitaetslevel: 'sportlich',
      status: 'verfuegbar',
    },
    {
      shelter_id: shelterId,
      name: 'Bella',
      tierart: 'katze',
      rasse: 'Maine Coon Mix',
      alter_jahre: 1,
      alter_monate: 8,
      groesse_kategorie: 'mittel',
      geschlecht: 'weiblich',
      beschreibung: 'Bella ist verspielt und neugierig. Sie kommt gut mit anderen Katzen aus.',
      charakter_tags: ['verspielt', 'neugierig', 'kinderlieb'],
      braucht_garten: false,
      kinderfreundlich: 'ja',
      vertraeglich_mit_tieren: true,
      erfahrung_benoetigt: 'anfaenger',
      aktivitaetslevel: 'mittel',
      status: 'verfuegbar',
    },
    {
      shelter_id: shelterId,
      name: 'Bruno',
      tierart: 'hund',
      rasse: 'Beagle',
      alter_jahre: 3,
      alter_monate: 0,
      groesse_kategorie: 'mittel',
      geschlecht: 'maennlich',
      beschreibung: 'Bruno ist ein aufgeweckter Beagle, der Kinder liebt und gut mit anderen Tieren auskommt.',
      charakter_tags: ['verspielt', 'anhänglich', 'kinderlieb'],
      braucht_garten: false,
      kinderfreundlich: 'ja',
      vertraeglich_mit_tieren: true,
      erfahrung_benoetigt: 'anfaenger',
      aktivitaetslevel: 'mittel',
      status: 'verfuegbar',
    },
  ];

  for (const pet of mockPets) {
    const { data, error } = await admin.from('pets').insert(pet).select('id, name').single();
    if (error) {
      console.log(`   ❌ ${pet.name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${pet.name} (${pet.tierart}) → ID: ${data.id}`);
    }
  }

  console.log('\n✅ Seed abgeschlossen!');
  console.log(`   Login für Tests: ${SHELTER_EMAIL} / Swipet1234!`);
}

run().catch(console.error);
