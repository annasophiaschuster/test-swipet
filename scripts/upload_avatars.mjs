import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL = "https://rdkxfctjdwsyvzbzsxsd.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJka3hmY3RqZHdzeXZ6YnpzeHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMzg2MzIsImV4cCI6MjA4OTYxNDYzMn0.m_qa1jJ9LTZNA3lxR4lXqm3zerx9QVQRhmW6Z_0YzOE";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const PERSONS = [
  { name: "Anna Müller",  id: "a1000000-0000-0000-0000-000000000001" },
  { name: "Max Schmidt",  id: "a1000000-0000-0000-0000-000000000002" },
  { name: "Lisa Weber",   id: "a1000000-0000-0000-0000-000000000003" },
  { name: "Tom Fischer",  id: "a1000000-0000-0000-0000-000000000004" },
  { name: "Sarah Koch",   id: "a1000000-0000-0000-0000-000000000005" },
  { name: "Jan Becker",   id: "a1000000-0000-0000-0000-000000000006" },
];

const PHOTOS_DIR = "/Users/sophiaschuster/Desktop/personen";
const BUCKET = "avatars";

async function run() {
  // Sign in
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: "info@swipet.de",
    password: "Swipet2026!",
  });
  if (authErr) { console.error("Login fehlgeschlagen:", authErr.message); process.exit(1); }
  console.log("Eingeloggt als info@swipet.de\n");

  for (const person of PERSONS) {
    console.log(`--- ${person.name} ---`);
    const filename = `${person.name}.png`;
    const filePath = join(PHOTOS_DIR, filename);

    let fileBuffer;
    try {
      fileBuffer = readFileSync(filePath);
    } catch {
      console.log(`  Datei nicht gefunden: ${filename}`);
      continue;
    }

    const storagePath = `${person.id}/avatar.png`;

    // Remove old file
    await supabase.storage.from(BUCKET).remove([storagePath]);

    // Upload
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (upErr) {
      console.error(`  Upload Fehler:`, upErr.message);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const avatarUrl = urlData.publicUrl;

    // Update profile
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", person.id);

    if (dbErr) {
      console.error(`  DB Fehler:`, dbErr.message);
    } else {
      console.log(`  ✓ Hochgeladen & gespeichert: ${avatarUrl}`);
    }
  }

  console.log("\nFertig!");
  process.exit(0);
}

run();
