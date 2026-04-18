import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL = "https://rdkxfctjdwsyvzbzsxsd.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJka3hmY3RqZHdzeXZ6YnpzeHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMzg2MzIsImV4cCI6MjA4OTYxNDYzMn0.m_qa1jJ9LTZNA3lxR4lXqm3zerx9QVQRhmW6Z_0YzOE";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const DOGS = [
  { name: "Atan",   id: "f0e25bf8-5afc-4a03-bedb-9f1b3e3e1a9b" },
  { name: "Bella",  id: "41143474-9e00-4e29-ac18-c8873034bb40" },
  { name: "Bruno",  id: "23cccb8e-e60d-4792-94f3-e704a8840b59" },
  { name: "Cookie", id: "825d8e16-da11-4b26-8f87-9a1064709e51" },
  { name: "Kira",   id: "ee06c905-5753-4ce6-8d7b-744294ef1278" },
  { name: "Milo",   id: "04ac8178-fadb-456d-a9c4-fb532ae96192" },
  { name: "Rocky",  id: "1e369510-5b2f-4df3-b0db-c55e4b3d57d6" },
  { name: "Zeus",   id: "2feddb7d-c6a5-486e-a1bf-7a9bee6d8e4d" },
];

const PHOTOS_DIR = "/Users/sophiaschuster/Desktop/Hunde";
const BUCKET = "pet-photos";

async function run() {
  // Sign in
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: "info@swipet.de",
    password: "UploadTemp999!",
  });
  if (authErr) { console.error("Login fehlgeschlagen:", authErr.message); process.exit(1); }
  console.log("Eingeloggt als info@swipet.de");

  for (const dog of DOGS) {
    console.log(`\n--- ${dog.name} ---`);

    // Delete old photos from DB
    await supabase.from("pet_photos").delete().eq("pet_id", dog.id);

    // Find photos (1, 2, 3)
    const photoRows = [];
    for (let i = 1; i <= 3; i++) {
      // Handle Rocky's "Rocky 1 .png" (space before .png)
      let filename = `${dog.name} ${i}.png`;
      if (dog.name === "Rocky" && i === 1) filename = "Rocky 1 .png";

      const filePath = join(PHOTOS_DIR, dog.name, filename);
      let fileBuffer;
      try {
        fileBuffer = readFileSync(filePath);
      } catch {
        console.log(`  Überspringe ${filename} (nicht gefunden)`);
        continue;
      }

      const storagePath = `${dog.id}/${i - 1}.png`;

      // Remove old file from storage first
      await supabase.storage.from(BUCKET).remove([storagePath]);

      // Upload
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (upErr) {
        console.error(`  Upload Fehler ${filename}:`, upErr.message);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      photoRows.push({ pet_id: dog.id, url: urlData.publicUrl, position: i - 1 });
      console.log(`  Hochgeladen: ${filename} → position ${i - 1}`);
    }

    // Insert into pet_photos
    if (photoRows.length > 0) {
      const { error: dbErr } = await supabase.from("pet_photos").insert(photoRows);
      if (dbErr) console.error(`  DB Fehler:`, dbErr.message);
      else console.log(`  ${photoRows.length} Fotos in DB gespeichert`);
    }
  }

  console.log("\nFertig!");
  process.exit(0);
}

run();
